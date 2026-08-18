## Purpose

Defines deck-driven quizzes that assess a student's ability to recognize and produce signs, drawing exclusively from words the student has already learned and updating mastery from results.

## ADDED Requirements

### Requirement: Quiz only from the learned deck
The system SHALL generate quiz items only from words in the student's deck and SHALL require a minimum number of learned words before a quiz can start.

#### Scenario: Deck has enough words
- **WHEN** the student has at least the minimum number of learned words and starts a quiz
- **THEN** the system generates quiz items drawn only from that student's deck

#### Scenario: Deck too small
- **WHEN** the student has fewer than the minimum number of learned words
- **THEN** the system does not start a quiz
- **AND** informs the student how many more words are needed

### Requirement: Sign-the-word quiz mode
The system SHALL offer a quiz mode that presents a learned word and requires the student to fingerspell the whole word on camera, using the fingerspelling-recognition capability to score the answer.

#### Scenario: Word signed correctly
- **WHEN** the student is shown a word and fingerspells all its letters correctly
- **THEN** the system marks the item correct
- **AND** updates the word's mastery state

#### Scenario: Word signed incorrectly
- **WHEN** the student fails to fingerspell the word correctly
- **THEN** the system marks the item incorrect

### Requirement: Sign-the-letter quiz mode
The system SHALL offer a quiz mode that presents a single letter and requires the student to fingerspell that one letter on camera.

#### Scenario: Letter signed correctly
- **WHEN** the student is shown a letter and signs it correctly
- **THEN** the system marks the item correct

#### Scenario: Letter signed incorrectly
- **WHEN** the student signs a letter that does not match the prompted letter
- **THEN** the system marks the item incorrect

### Requirement: Sign-the-number quiz mode
The system SHALL offer a quiz mode that presents a number (a digit 0–9) and requires the student to sign that number in ASL on camera, using the fingerspelling-recognition capability to score the answer.

#### Scenario: Number signed correctly
- **WHEN** the student is shown a number and signs it correctly in ASL
- **THEN** the system marks the item correct

#### Scenario: Number signed incorrectly
- **WHEN** the student signs a number that does not match the prompted number
- **THEN** the system marks the item incorrect

### Requirement: Report quiz results and update mastery
At the end of a quiz the system SHALL report the score and SHALL update each involved word's mastery state based on performance.

#### Scenario: Results summarized
- **WHEN** a quiz completes
- **THEN** the system shows the number of correct and incorrect items
- **AND** updates the mastery state of the words quizzed
