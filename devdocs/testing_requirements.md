```IGNORE THIS BLOCK OF TEXT
This is the doc I used to get started building out my tests for this extension, and I keep it around so I can build on the test cases over time.
```

I want to make sure I have a set of tests developed for this project, and I need you to help me.

I have not built any tests yet.

Here are my thoughts on test cases I would like to cover:

-   Create a test that attempts to include a binary file and verify it's not included in the output.
-   Verify that negative numbers are not allowed for max depth or token length settings.
-   Create a test with a mock .gitignore file and verify that ignored files are not included in the output.
-   Create a test with a file larger than 1MB and verify the warning message is shown.
-   Create a test that exceeds the token limit and verify the warning message is shown.
-   Verify that the ASCII tree is correctly generated for a given file structure.
-   Verify that the output is copied to the clipboard when the setting is enabled.
-   Change settings in the UI and verify they are saved and loaded correctly.
-   Verify that the content of open text files is correctly included in the output.
-   Verify that file paths in the output are correctly generated relative to the workspace root.
-   Verify that the tree structure respects the configured depth limit.
-   Verify that additional instructions are correctly appended to the output.

Walk me through step by step how to get testss written and auto executed on compile.
