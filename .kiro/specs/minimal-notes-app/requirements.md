# Requirements Document

## Introduction

This document outlines the requirements for a minimal note-taking application built with Electron.js and styled with Tailwind CSS. The application will allow users to manage a collection of notes, each with a title and content. The user interface will consist of a sidebar for note management (creating, deleting, renaming) and a main editor area for note content, using Tiptap for rich text editing. All data will be stored locally in a SQLite database.

## Requirements

### Requirement 1: Note Creation

**User Story:** As a user, I want to create a new note, so that I can capture my thoughts and ideas.

#### Acceptance Criteria

1.  WHEN the user clicks the "New Note" button, THEN the system SHALL create a new note with a default title (e.g., "New Note").
2.  WHEN a new note is created, THEN the system SHALL display the new note in the sidebar.
3.  WHEN a new note is created, THEN the system SHALL open the new note in the editor.
4.  IF the database connection is unavailable, THEN the system SHALL display an error message to the user.

### Requirement 2: Note Deletion

**User Story:** As a user, I want to delete an existing note, so that I can remove notes I no longer need.

#### Acceptance Criteria

1.  WHEN the user right-clicks on a note in the sidebar and selects "Delete", THEN the system SHALL prompt the user for confirmation.
2.  IF the user confirms the deletion, THEN the system SHALL remove the note from the sidebar.
3.  IF the user confirms the deletion, THEN the system SHALL remove the note from the database.
4.  IF the user cancels the deletion, THEN the system SHALL NOT remove the note.

### Requirement 3: Note Renaming

**User Story:** As a user, I want to rename a note, so that I can give it a more descriptive title.

#### Acceptance Criteria

1.  WHEN the user right-clicks on a note in the sidebar and selects "Rename", THEN the system SHALL allow the user to edit the note's title in-place.
2.  WHEN the user finishes editing the title and presses Enter, THEN the system SHALL save the new title to the database.
3.  IF the new title is empty, THEN the system SHALL revert to the original title.

### Requirement 4: Note Editing

**User Story:** As a user, I want to edit the content of a note, so that I can write and format my thoughts.

#### Acceptance Criteria

1.  WHEN the user selects a note from the sidebar, THEN the system SHALL display the note's content in the Tiptap editor.
2.  WHEN the user modifies the content in the editor, THEN the system SHALL automatically save the changes to the database.
3.  The editor SHALL support basic formatting (bold, italic, lists).

### Requirement 5: Note Persistence

**User Story:** As a user, I want my notes to be saved automatically, so that I don't lose my work.

#### Acceptance Criteria

1.  WHEN a note's title or content is changed, THEN the system SHALL save the changes to the SQLite database.
2.  WHEN the application is closed and reopened, THEN the system SHALL load all existing notes from the database.

### Requirement 6: User Interface

**User Story:** As a user, I want a simple and intuitive interface, so that I can focus on taking notes.

#### Acceptance Criteria

1.  The application SHALL have a single window.
2.  The window SHALL be divided into a sidebar on the left and a main content area on the right.
3.  The sidebar SHALL display a list of note titles.
4.  The main content area SHALL contain the Tiptap editor.
5.  The application's styling SHALL be implemented using Tailwind CSS.