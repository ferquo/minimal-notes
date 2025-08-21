# Implementation Plan

This plan outlines the steps to implement the minimal note-taking app. Each step is designed to be an incremental and testable unit of work.

- [ ] 1. **Project Setup**
    - [ ] 1.1. Initialize a new Electron project using a suitable boilerplate (e.g., `electron-react-boilerplate` or a similar template with Vite).
        - _Requirements: 6.1, 6.5_
    - [ ] 1.2. Install and configure Tailwind CSS for styling.
        - _Requirements: 6.5_
    - [ ] 1.3. Install `better-sqlite3` for database interaction and `@tiptap/react` and `@tiptap/starter-kit` for the editor.
        - _Requirements: 5.1_

- [ ] 2. **Database and Main Process Logic**
    - [ ] 2.1. Create a `database.js` module in the main process to handle all SQLite operations.
        - Implement functions for `init`, `getNotes`, `createNote`, `updateNoteTitle`, `updateNoteContent`, and `deleteNote`.
        - The `init` function should create the `notes` table if it doesn't exist.
        - _Requirements: 5.1, 5.2_
    - [ ] 2.2. In `main.js`, initialize the database connection when the app starts.
        - _Requirements: 5.2_
    - [ ] 2.3. Create a `preload.js` script to expose the database functions to the renderer process using `contextBridge`.
        - Expose the functions as `window.db.getNotes`, `window.db.createNote`, etc.
        - _Requirements: 5.1, 5.2_

- [ ] 3. **Core UI Components**
    - [ ] 3.1. Create the main `App.js` component with a two-column layout (sidebar and main content area) using Tailwind CSS.
        - _Requirements: 6.2_
    - [ ] 3.2. Create the `Sidebar.js` component.
        - It should fetch and display the list of notes from the database on component mount using the exposed preload functions.
        - Implement a "New Note" button that calls the `createNote` function and refreshes the note list.
        - _Requirements: 1.1, 1.2, 6.3_
    - [ ] 3.3. Create the `NoteItem.js` component to display a single note title in the sidebar.
        - Implement a click handler to set the currently selected note in the `App.js` state.
        - _Requirements: 4.1_
    - [ ] 3.4. Create the `Editor.js` component.
        - Use the `@tiptap/react` `useEditor` hook to create a Tiptap instance.
        - Configure the `StarterKit` for basic formatting.
        - The editor's content should be updated when a new note is selected.
        - _Requirements: 4.1, 4.3_

- [ ] 4. **Connecting UI to Functionality**
    - [ ] 4.1. Implement the logic to pass the selected note's content to the `Editor.js` component.
        - _Requirements: 4.1_
    - [ ] 4.2. In the `Editor.js` component, add logic to automatically save the note's content when it changes.
        - Use a debounced function to call `window.db.updateNoteContent` to avoid excessive database writes.
        - _Requirements: 4.2, 5.1_
    - [ ] 4.3. Implement the note deletion functionality.
        - Add a context menu (on right-click) to the `NoteItem.js` component with a "Delete" option.
        - The "Delete" option should show a confirmation dialog before calling `window.db.deleteNote`.
        - After deletion, the note list in the sidebar should be refreshed.
        - _Requirements: 2.1, 2.2, 2.3, 2.4_
    - [ ] 4.4. Implement the note renaming functionality.
        - Add a "Rename" option to the context menu in `NoteItem.js`.
        - When clicked, the note title should become an editable input field.
        - On blur or Enter, the new title should be saved using `window.db.updateNoteTitle`, and the note list should be refreshed.
        - _Requirements: 3.1, 3.2, 3.3_

- [ ] 5. **Final Touches**
    - [ ] 5.1. Add basic error handling to display alerts or notifications for database errors.
        - _Requirements: 1.4_
    - [ ] 5.2. Style the application using Tailwind CSS to match the minimal design aesthetic.
        - _Requirements: 6.5_