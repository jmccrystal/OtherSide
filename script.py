import os

def combine_files_recursively(directory, target_extensions, output_file, exclude_patterns=None):
    """
    Combines files with specific extensions found recursively in a directory,
    excluding files or directories that match any of the exclude_patterns.

    Parameters:
    - directory: Top-level directory to start searching.
    - target_extensions: A list of file extensions to include (e.g. [".js", ".py"]).
    - output_file: Path to the output file where the combined content will be written.
    - exclude_patterns: A list of substrings. If any is found in a file or folder name (case-insensitive),
                        that file/folder is skipped.
    """
    if exclude_patterns is None:
        exclude_patterns = []

    # Get the current working directory to compute relative paths
    current_dir = os.getcwd()

    # Open the output file in write mode (overwrite if exists)
    with open(output_file, 'w', encoding='utf-8') as outfile:
        # Walk through the directory, including all subdirectories
        for root, dirs, files in os.walk(directory):
            # Exclude directories whose names contain any of the exclusion patterns.
            dirs[:] = [d for d in dirs if not any(pattern.lower() in d.lower() for pattern in exclude_patterns)]

            for filename in files:
                # Exclude files whose names contain any of the exclusion patterns.
                if any(pattern.lower() in filename.lower() for pattern in exclude_patterns):
                    continue

                # Check if the file's extension matches one of the target extensions.
                if any(filename.lower().endswith(ext.lower()) for ext in target_extensions):
                    file_path = os.path.join(root, filename)
                    # Compute the relative path from the current directory.
                    rel_path = os.path.relpath(file_path, current_dir)

                    # Write the relative file path as a header in the output file.
                    outfile.write(f"=== {rel_path} ===\n")

                    # Read and write the file contents.
                    with open(file_path, 'r', encoding='utf-8', errors='replace') as infile:
                        contents = infile.read()
                        outfile.write(contents)
                        outfile.write("\n")  # Add a separator newline

if __name__ == "__main__":
    # Example usage:
    directory = "."
    # Specify multiple file extensions to include.
    target_extensions = [".js", ".html", ".json", "Dockerfile", ".ts", ".css", ".scss", ".md", ".yml", ".yaml", ".tsx", ".jsx", ".sql", ".sh", ".py"]
    output_file = os.path.join(directory, "combined.txt")
    # Exclude any file or folder that contains these substrings (e.g., "node_modules", "package-lock.json", etc.)
    exclude_patterns = ["node_modules", "package-lock.json", "metadata", "schema", ".next", ".git", ".idea", ".vscode", ".env", ".gitignore", ".dockerignore", ".eslintrc", ".prettierrc", ".editorconfig", ".gitattributes", ".babelrc", ".npmrc", ".yarnrc", ".yarn", ".lock", ".cache", ".log", ".tmp", ".swp", ".swm", ".swo", ".venv"]

    combine_files_recursively(directory, target_extensions, output_file, exclude_patterns)
    print(f"Files with extensions {target_extensions} from {os.getcwd()} have been combined into {output_file}.")
