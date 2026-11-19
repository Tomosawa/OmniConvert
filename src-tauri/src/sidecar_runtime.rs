use std::path::Path;

/// In development there is no bundled runtime, so system settings apply.
pub fn configure(resource_dir: &Path) {
    let runtime = resource_dir.join("sidecar-runtime");
    if !runtime.exists() {
        return;
    }
    #[cfg(target_os = "macos")]
    {
        std::env::set_var("MAGICK_CODER_MODULE_PATH", runtime.join("magick-modules"));
        std::env::set_var("MAGICK_CONFIGURE_PATH", runtime.join("magick-config"));
    }
    #[cfg(target_os = "windows")]
    {
        let mut paths = vec![
            runtime.join("magick"),
            runtime.join("ffmpeg"),
            runtime.join("pandoc"),
        ];
        if let Some(existing) = std::env::var_os("PATH") {
            paths.extend(std::env::split_paths(&existing));
        }
        if let Ok(path) = std::env::join_paths(paths) {
            std::env::set_var("PATH", path);
        }
        std::env::set_var("MAGICK_HOME", runtime.join("magick"));
        std::env::set_var("MAGICK_CONFIGURE_PATH", runtime.join("magick"));
        let coders = runtime.join("magick").join("modules").join("coders");
        std::env::set_var(
            "MAGICK_CODER_MODULE_PATH",
            if coders.is_dir() {
                coders
            } else {
                runtime.join("magick")
            },
        );
    }
}
