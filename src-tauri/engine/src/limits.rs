use crate::types::DiffLimitError;

pub const MAX_INPUT_BYTES: usize = 5 * 1024 * 1024;
pub const MAX_INPUT_LINES: usize = 10_000;

pub fn get_input_limit_error(content: &str) -> Option<DiffLimitError> {
    if content.len() > MAX_INPUT_BYTES {
        return Some(DiffLimitError::new("Each input is limited to 5 MiB."));
    }

    let mut lines = 1usize;
    for byte in content.bytes() {
        if byte == b'\n' {
            lines += 1;
            if lines > MAX_INPUT_LINES {
                return Some(DiffLimitError::new(format!(
                    "Each input is limited to {} lines.",
                    MAX_INPUT_LINES
                )));
            }
        }
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_max_input_bytes() {
        let content = "a".repeat(MAX_INPUT_BYTES);
        assert!(get_input_limit_error(&content).is_none());
        let content = "a".repeat(MAX_INPUT_BYTES + 1);
        assert!(get_input_limit_error(&content).is_some());
    }

    #[test]
    fn test_max_input_lines() {
        let content = "a\n".repeat(MAX_INPUT_LINES - 1);
        assert!(get_input_limit_error(&content).is_none());
        let content = "a\n".repeat(MAX_INPUT_LINES);
        assert!(get_input_limit_error(&content).is_some());
    }

    #[test]
    fn test_empty_content() {
        assert!(get_input_limit_error("").is_none());
    }

    #[test]
    fn test_error_message_format() {
        let content = "a".repeat(MAX_INPUT_BYTES + 1);
        let err = get_input_limit_error(&content).unwrap();
        assert!(err.message.contains("5 MiB"));

        let content = "a\n".repeat(MAX_INPUT_LINES);
        let err = get_input_limit_error(&content).unwrap();
        assert!(err.message.contains("10000"));
    }
}
