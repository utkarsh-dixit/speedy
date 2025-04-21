use std::fs;
use std::path::PathBuf;
use tauri_specta::ts;
use specta::collect_types;

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
    
    // For a build script, we cannot directly reference the types
    // Instead, we export an empty collection for now
    // The actual type generation will be handled at runtime
    let empty_types = collect_types![];
    
    // Generate a TypeScript file with the basic invoke setup
    ts::export(empty_types, export_path.to_str().unwrap())
        .expect("Failed to export TypeScript bindings");
        
    // Print a message to remind the developer to run the app to generate complete types
    println!("cargo:warning=Run the app with `pnpm tauri dev` to generate complete TypeScript bindings.");
}
