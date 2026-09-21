//! cURL request runner for the templates panel.
//!
//! Unlike the other workflows this takes user-composed input (method, URL,
//! headers, body), so every field is validated and mapped onto a fixed argument
//! layout. curl is spawned without a shell, and the flags below close the ways
//! curl itself can turn text into side effects:
//!
//! * `-q`               ignore any `~/.curlrc`
//! * `--proto`          http(s) only: no `file://`, `ftp://`, `gopher://`, ...
//! * `--data-raw`       a body starting with `@` is sent as text, never read from a file
//! * `--globoff`        `[1-100]` / `{a,b}` in a URL is not expanded into many requests
//! * `-H name: value`   the name is validated, so `-H @file` cannot load headers from disk

use serde::Deserialize;
use tauri::AppHandle;

use crate::commands::{blocking, resolve_dir, ActionResult};
use crate::runner::run_streamed;

const METHODS: &[&str] = &["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];
const MAX_URL_LEN: usize = 8 * 1024;
const MAX_HEADERS: usize = 50;
const MAX_BODY_BYTES: usize = 1_000_000;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CurlRequest {
    pub method: String,
    pub url: String,
    /// One `Name: value` entry per element; blank entries are ignored.
    pub headers: Vec<String>,
    pub body: Option<String>,
    #[serde(default)]
    pub follow_redirects: bool,
}

fn valid_header_name(name: &str) -> bool {
    !name.is_empty()
        && name
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b == b'-' || b == b'_')
}

/// Validates the request and builds curl's argument list.
fn build_args(req: &CurlRequest) -> Result<Vec<String>, String> {
    let method = req.method.trim().to_ascii_uppercase();
    if !METHODS.contains(&method.as_str()) {
        return Err(format!("Unsupported method `{}`.", req.method.trim()));
    }

    let url = req.url.trim();
    let scheme_ok = url
        .get(..8)
        .is_some_and(|p| p.eq_ignore_ascii_case("https://"))
        || url.get(..7).is_some_and(|p| p.eq_ignore_ascii_case("http://"));
    if !scheme_ok {
        return Err("The URL must start with http:// or https://.".into());
    }
    if url.len() > MAX_URL_LEN || url.chars().any(|c| c.is_whitespace() || c.is_control()) {
        return Err("The URL contains spaces or control characters (or is too long).".into());
    }

    let mut args: Vec<String> = [
        "-q", "-sS", "-i", "--globoff", "--proto", "=http,https", "--proto-redir", "=http,https",
        "--max-time", "30",
    ]
    .map(String::from)
    .into();

    if req.follow_redirects {
        args.extend(["-L", "--max-redirs", "5"].map(String::from));
    }

    if method == "HEAD" {
        // `-X HEAD` would make curl wait for a body that never arrives.
        args.push("-I".into());
    } else {
        args.extend(["-X".into(), method.clone()]);
    }

    let headers: Vec<&str> = req
        .headers
        .iter()
        .map(|h| h.trim())
        .filter(|h| !h.is_empty())
        .collect();
    if headers.len() > MAX_HEADERS {
        return Err(format!("Too many headers (max {MAX_HEADERS})."));
    }
    for header in headers {
        let Some((name, _)) = header.split_once(':') else {
            return Err(format!("Header `{header}` must look like `Name: value`."));
        };
        if !valid_header_name(name.trim()) {
            return Err(format!("`{}` is not a valid header name.", name.trim()));
        }
        args.push("-H".into());
        args.push(header.to_string());
    }

    if let Some(body) = req.body.as_deref().filter(|b| !b.is_empty()) {
        if method == "HEAD" {
            return Err("HEAD requests cannot have a body.".into());
        }
        if body.len() > MAX_BODY_BYTES {
            return Err("The request body is larger than 1 MB.".into());
        }
        args.push("--data-raw".into());
        args.push(body.to_string());
    }

    args.push("--url".into());
    args.push(url.to_string());
    Ok(args)
}

#[tauri::command]
pub async fn curl_request(
    app: AppHandle,
    request: CurlRequest,
    project_dir: String,
    run_id: String,
) -> Result<ActionResult, String> {
    let dir = resolve_dir(&project_dir)?;

    blocking(move || {
        let args = match build_args(&request) {
            Ok(args) => args,
            Err(e) => return Ok(ActionResult::fail(e)),
        };
        let argv: Vec<&str> = args.iter().map(String::as_str).collect();

        Ok(if run_streamed(&app, &run_id, "curl", &argv, &dir)? {
            ActionResult::ok("Request finished. HTTP errors (4xx/5xx) show in the response above.")
        } else {
            ActionResult::fail("curl could not complete the request. See the output above.")
        })
    })
    .await
}

#[cfg(test)]
mod tests {
    use super::*;

    fn req(method: &str, url: &str) -> CurlRequest {
        CurlRequest {
            method: method.into(),
            url: url.into(),
            headers: vec![],
            body: None,
            follow_redirects: false,
        }
    }

    #[test]
    fn get_request_has_the_hardening_flags() {
        let args = build_args(&req("get", "https://example.com/api")).unwrap();
        assert_eq!(args[0], "-q", "-q must be first to be honoured");
        for flag in ["--globoff", "--proto", "=http,https", "--max-time"] {
            assert!(args.iter().any(|a| a == flag), "missing {flag}");
        }
        assert_eq!(&args[args.len() - 2..], ["--url", "https://example.com/api"]);
        assert!(args.windows(2).any(|w| w == ["-X", "GET"]));
    }

    #[test]
    fn rejects_non_http_schemes() {
        for url in ["file:///etc/passwd", "ftp://example.com", "gopher://x", "example.com", "", "-o /tmp/x"] {
            assert!(build_args(&req("GET", url)).is_err(), "{url} should be rejected");
        }
    }

    #[test]
    fn rejects_urls_with_whitespace() {
        assert!(build_args(&req("GET", "https://a.com/ -o /tmp/x")).is_err());
        assert!(build_args(&req("GET", "https://a.com/\nx")).is_err());
    }

    #[test]
    fn rejects_unknown_methods() {
        assert!(build_args(&req("TRACE", "https://a.com")).is_err());
        assert!(build_args(&req("GET --output x", "https://a.com")).is_err());
    }

    #[test]
    fn body_is_sent_raw_so_at_sign_cannot_read_files() {
        let mut r = req("POST", "https://a.com");
        r.body = Some("@/etc/passwd".into());
        let args = build_args(&r).unwrap();
        assert!(args.windows(2).any(|w| w == ["--data-raw", "@/etc/passwd"]));
        assert!(!args.iter().any(|a| a == "-d" || a == "--data"));
    }

    #[test]
    fn head_uses_dash_i_and_refuses_a_body() {
        let args = build_args(&req("HEAD", "https://a.com")).unwrap();
        assert!(args.iter().any(|a| a == "-I"));
        assert!(!args.iter().any(|a| a == "-X"));

        let mut r = req("HEAD", "https://a.com");
        r.body = Some("x".into());
        assert!(build_args(&r).is_err());
    }

    #[test]
    fn headers_are_validated_and_blank_lines_ignored() {
        let mut r = req("GET", "https://a.com");
        r.headers = vec!["  ".into(), "Accept: application/json".into(), "X-Api-Key:abc".into()];
        let args = build_args(&r).unwrap();
        assert!(args.windows(2).any(|w| w == ["-H", "Accept: application/json"]));
        assert!(args.windows(2).any(|w| w == ["-H", "X-Api-Key:abc"]));

        for bad in ["@/etc/passwd", "no colon here", ": empty name", "Bad Name: v", "a;b: v"] {
            r.headers = vec![bad.into()];
            assert!(build_args(&r).is_err(), "{bad:?} should be rejected");
        }
    }

    #[test]
    fn redirects_are_opt_in_and_capped() {
        let mut r = req("GET", "https://a.com");
        assert!(!build_args(&r).unwrap().iter().any(|a| a == "-L"));
        r.follow_redirects = true;
        let args = build_args(&r).unwrap();
        assert!(args.windows(3).any(|w| w == ["-L", "--max-redirs", "5"]));
    }
}
