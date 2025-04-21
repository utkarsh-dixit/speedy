use std::fs;
use std::path::PathBuf;
use tauri_specta::ts;
use specta::collect_types;
use specta::ts::{BigIntExportBehavior, ExportConfiguration};

fn main() {
    // Run the tauri plugin before building
    tauri_build::build();

    // Generate TypeScript bindings
    let mut export_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    export_path.pop(); // Move up to the workspace root
    export_path.push("src/src/bindings");
    
    // Create the directory if it doesn't exist
    fs::create_dir_all(&export_path).expect("Failed to create bindings directory");
    
    export_path.push("commands.ts");
    
    // For build scripts, we create skeleton bindings
    // The full type generation happens at runtime in debug mode
    println!("cargo:rerun-if-changed=src/api.rs");
    
    // Generate a TypeScript file with basic invoke setup
    let empty_types = collect_types![];
    ts::export(empty_types, export_path.to_str().unwrap())
        .expect("Failed to export TypeScript bindings");
    
    println!("cargo:warning=TypeScript bindings skeleton created. Complete types will be generated at runtime in debug mode.");
}
