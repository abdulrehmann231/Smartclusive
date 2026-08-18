## Purpose

Defines a lightweight sign-in that identifies a student so their deck, mastery, and video progress persist and stay private to them — without a full enterprise auth system.

## ADDED Requirements

### Requirement: Register with name, email, and password
The system SHALL let a new student register with a display name, an email address, and a password, and SHALL create a student identity for them. Passwords SHALL be stored hashed, never in plaintext, and each email SHALL identify at most one account.

#### Scenario: New student registers
- **WHEN** a student submits a valid name, a unique email, and a password
- **THEN** the system creates a student identity with that name and email
- **AND** stores the password only in hashed form
- **AND** starts an empty deck and progress for that identity

#### Scenario: Duplicate email rejected
- **WHEN** a student tries to register with an email already in use
- **THEN** the system rejects the registration
- **AND** does not create a second account for that email

### Requirement: Lightweight student sign-in
The system SHALL let a registered student sign in with their email and password and SHALL associate their session with their student identity. It SHALL NOT require a full/enterprise auth system (no SSO or role management).

#### Scenario: Student signs in
- **WHEN** a student provides an email and password matching a registered account
- **THEN** the system establishes a session tied to that student's identity

#### Scenario: Wrong credentials rejected
- **WHEN** a student provides an email or password that does not match a registered account
- **THEN** the system refuses to sign them in
- **AND** does not reveal whether the email or the password was wrong

### Requirement: Bind learning data to the signed-in student
The system SHALL scope decks, mastery, and video completion to the signed-in student's identity and SHALL keep them private to that student.

#### Scenario: Data follows the student across sessions
- **WHEN** a student signs in on a later session
- **THEN** the system loads that student's own deck, mastery, and video progress

#### Scenario: Another student cannot see the data
- **WHEN** a different student signs in on the same device
- **THEN** the system shows only their own deck and progress, not the previous student's

### Requirement: Sign out
The system SHALL allow a student to sign out, ending their session so their data is no longer accessible until they sign in again.

#### Scenario: Student signs out
- **WHEN** a signed-in student chooses to sign out
- **THEN** the system ends the session
- **AND** does not display that student's deck or progress until the next sign-in
