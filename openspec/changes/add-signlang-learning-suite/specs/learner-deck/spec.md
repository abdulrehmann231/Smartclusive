## Purpose

Defines per-student storage of learned words and their mastery state, serving as the single source of truth that the learning flows write to and that quizzes read from.

## ADDED Requirements

### Requirement: Maintain a per-student deck
The system SHALL maintain a deck of learned words scoped to an individual student and SHALL persist it across sessions.

#### Scenario: Deck persists across sessions
- **WHEN** a student returns after learning words in a previous session
- **THEN** the system shows the previously learned words in their deck

#### Scenario: Decks are isolated per student
- **WHEN** two different students use the app
- **THEN** each student sees only the words in their own deck

### Requirement: Add a learned word to the deck
The system SHALL add a word to a student's deck when a learning flow verifies the word as learned, recording the Indonesian word, the English word, and the time it was learned.

#### Scenario: Verified word is stored
- **WHEN** a learning flow reports a word as learned for a student
- **THEN** the system stores the word in that student's deck with its Indonesian and English forms

#### Scenario: No duplicate entries
- **WHEN** a word that already exists in the student's deck is learned again
- **THEN** the system does not create a second entry for that word

### Requirement: Track mastery state per word
The system SHALL record a mastery state for each deck word and SHALL update it based on subsequent quiz performance.

#### Scenario: New word starts unmastered
- **WHEN** a word is first added to the deck
- **THEN** the system records its mastery state as not yet mastered

#### Scenario: Mastery improves after correct quiz answers
- **WHEN** the student answers quiz items for a word correctly
- **THEN** the system increases that word's mastery state

### Requirement: Expose the deck for quizzing
The system SHALL make the set of learned words available to the quiz capability so quizzes are drawn only from words the student has learned.

#### Scenario: Quiz eligibility reflects the deck
- **WHEN** the quiz capability requests eligible words
- **THEN** the system returns only words currently in that student's deck
