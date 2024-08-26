OK, we have a new project on which we are going to work through a solution.

I want to write a vscode extension that does a couple of things. The extension will be called Prompt Perfect.

For now, I am the ideal customer, but I will eventually want to publish this to the extensions store.

The use case is to simplify and speed up the time required to generate a full context prompt of relevant source files and dire structure of a project on which I am working so that I can insert that into the context window for a LLM chat.

I specifically am NOT trying to interact with the LLMs via API in this extension. This is meant to solve one problem - getting the files associated with the problem I am trying to solve into a well structured prompt so that I can copy and paste it into an LLM chat window.

-   Creates two new Command Pallette commands: Prompt Perfect: Open Editors; Prompt Perfect: Open Editors and ASCII Tree
-   When executed, the commands will do what is described below.

_Open Editors_

-   For each of the open files in the editor, read in the full contents of the file. Remember, since the customer is focused on the files that are open, we don't care about file type filtering, or custom file grouping.
-   Warn on a large file inclusion (size set in settings file). Display the large file name(s) in a message box with the warning, and ask if the customer wants to proceed with a Yes or Cancel
-   write the contents of the files to a single output window in vscode using the template (content between the double quotes - meaning I want you to use backticks in what you write to the output window) listed below
-   use only the files that are open for prompt generation, and NO OTHER FILES
-   copy the contents of the output to the clipboard
-   remember, since we are outputting a specific output, we don't care about prompt templates for now
-   at some point we may elect to add recent prompt output history, but let's ignore that for now

"

````{dir from project root to file}/{filename}
{file contents}
"

- If there are 5 files open, then the expectation is the output window will have 5 of those blocks
- If the token limit is reached, pop a message that displays the number of tokens required for the files open and the current value for max tokens set in the input panel.

*Open Editors and ASCII Tree*
- Same out Open Editors, but include an additional block of text at the top, which honors the .gitignore file, and is an ASCII art representation of the source tree.
- uses the depth limit from the panel
- display: include all FOLDERS, and also include in the tree the files which were open for prompt generation; DO NOT include files in the ASCII tree which are not opened.

"
```Source Tree
{ASCII art showing the file structure of the project from the root of the project}
````

Additionally, I would like the extension to support the following:

-   adds a logo'd button to the Activity Bar
-   Clicking on the Activity Bar button for Perfect Prompt opens a panel that:
    -   displays a welcome text message that is hardcoded
    -   check box for "limit prompt length?" - default no
        -   if checked, another control below it becomes enabled, and it's a numerical input for max tokens for prompt generation.
    -   a check box for "auto copy Output to clipboard" - default value set to true; must store
    -   label and numerical input for tree depth limit - default value of 4, with an additional option for "no limit"
    -   displays a text input with text above it that says "Input any additional instructions you would like to include in your Open Editors prompt generation" and the default value is: "If there is a file imported/included that I forgot to include or some other file you think I may have already created but have not included, please ask for that file before starting to generate a response."
    -   A button to "Save Changes" for any of the inputs. Inactive until a change is detected, and then saves to an appropriate settings or json file for Perfect Prompt.
-   store settings in json
