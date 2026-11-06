use crate::types::{DiffLine, DiffType};

#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum MarkerKind {
    Added,
    Removed,
    Modified,
}

#[derive(Debug, Clone, Copy, PartialEq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GroupPosition {
    pub kind: MarkerKind,
    pub top: f64,
    pub height: f64,
}

#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChangeMarker {
    pub index: usize,
    pub kind: MarkerKind,
    pub top: f64,
    pub height: f64,
}

pub fn group_kind(types: &[DiffType]) -> MarkerKind {
    if types.iter().all(|t| *t == DiffType::Added) {
        MarkerKind::Added
    } else if types.iter().all(|t| *t == DiffType::Removed) {
        MarkerKind::Removed
    } else {
        MarkerKind::Modified
    }
}

pub fn to_markers(groups: &[GroupPosition], scroll_height: f64) -> Vec<ChangeMarker> {
    if scroll_height <= 0.0 {
        return Vec::new();
    }
    groups
        .iter()
        .enumerate()
        .map(|(index, group)| ChangeMarker {
            index,
            kind: group.kind,
            top: group.top / scroll_height,
            height: group.height / scroll_height,
        })
        .collect()
}

/// Computes group positions from diff lines for marker rendering
pub fn compute_group_positions(
    lines: &[DiffLine],
    line_height: f64,
<<<<<<< HEAD
    _view_mode: crate::types::DiffViewMode,
    _wrap_lines: bool,
=======
    view_mode: crate::types::DiffViewMode,
    wrap_lines: bool,
>>>>>>> origin/master
) -> Vec<GroupPosition> {
    let mut groups = Vec::new();
    let mut current_group: Option<(MarkerKind, usize)> = None;
    let mut line_index = 0;

    for line in lines {
        if line.r#type != DiffType::Equal {
            let kind = match line.r#type {
                DiffType::Added => MarkerKind::Added,
                DiffType::Removed => MarkerKind::Removed,
                DiffType::Modified => MarkerKind::Modified,
                DiffType::Equal => unreachable!(),
            };

            match current_group {
                Some((current_kind, start_index)) if current_kind == kind => {
                    // Continue current group
                    current_group = Some((kind, start_index));
                }
                _ => {
                    // Start new group
                    if let Some((prev_kind, start_index)) = current_group {
                        let top = start_index as f64 * line_height;
                        let height = (line_index - start_index) as f64 * line_height;
                        groups.push(GroupPosition {
                            kind: prev_kind,
                            top,
                            height: height.max(line_height),
                        });
                    }
                    current_group = Some((kind, line_index));
                }
            }
        } else if current_group.is_some() {
            // End current group on unchanged line
            if let Some((prev_kind, start_index)) = current_group {
                let top = start_index as f64 * line_height;
                let height = (line_index - start_index) as f64 * line_height;
                groups.push(GroupPosition {
                    kind: prev_kind,
                    top,
                    height: height.max(line_height),
                });
                current_group = None;
            }
        }
        line_index += 1;
    }

    // Handle trailing group
    if let Some((prev_kind, start_index)) = current_group {
        let top = start_index as f64 * line_height;
        let height = (line_index - start_index) as f64 * line_height;
        groups.push(GroupPosition {
            kind: prev_kind,
            top,
            height: height.max(line_height),
        });
    }

    groups
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::DiffLine;

    fn make_line(r#type: DiffType, content: &str) -> DiffLine {
        DiffLine {
            r#type,
            original_line_number: Some(1),
            changed_line_number: Some(1),
            content: content.to_string(),
            original_content: None,
            changed_content: None,
            char_diffs: None,
        }
    }

    #[test]
    fn test_group_kind() {
<<<<<<< HEAD
        assert_eq!(
            group_kind(&[DiffType::Added, DiffType::Added]),
            MarkerKind::Added
        );
        assert_eq!(
            group_kind(&[DiffType::Removed, DiffType::Removed]),
            MarkerKind::Removed
        );
        assert_eq!(
            group_kind(&[DiffType::Modified, DiffType::Added]),
            MarkerKind::Modified
        );
        assert_eq!(
            group_kind(&[DiffType::Removed, DiffType::Modified]),
            MarkerKind::Modified
        );
=======
        assert_eq!(group_kind(&[DiffType::Added, DiffType::Added]), MarkerKind::Added);
        assert_eq!(group_kind(&[DiffType::Removed, DiffType::Removed]), MarkerKind::Removed);
        assert_eq!(group_kind(&[DiffType::Modified, DiffType::Added]), MarkerKind::Modified);
        assert_eq!(group_kind(&[DiffType::Removed, DiffType::Modified]), MarkerKind::Modified);
>>>>>>> origin/master
    }

    #[test]
    fn test_to_markers() {
        let groups = vec![
<<<<<<< HEAD
            GroupPosition {
                kind: MarkerKind::Added,
                top: 10.0,
                height: 20.0,
            },
            GroupPosition {
                kind: MarkerKind::Removed,
                top: 50.0,
                height: 30.0,
            },
=======
            GroupPosition { kind: MarkerKind::Added, top: 10.0, height: 20.0 },
            GroupPosition { kind: MarkerKind::Removed, top: 50.0, height: 30.0 },
>>>>>>> origin/master
        ];
        let markers = to_markers(&groups, 100.0);
        assert_eq!(markers.len(), 2);
        assert_eq!(markers[0].top, 0.1);
        assert_eq!(markers[0].height, 0.2);
        assert_eq!(markers[1].top, 0.5);
        assert_eq!(markers[1].height, 0.3);
    }

    #[test]
    fn test_to_markers_zero_height() {
        let markers = to_markers(&[], 0.0);
        assert!(markers.is_empty());
    }
<<<<<<< HEAD
}
=======
}
>>>>>>> origin/master
