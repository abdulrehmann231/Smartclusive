## Purpose

Defines the guided word-card flow that teaches a learner to map an Indonesian word to its English meaning through progressive picture reveals, then to fingerspell the word, adding it to their deck once produced correctly.

## ADDED Requirements

### Requirement: Present an Indonesian word card
The system SHALL let a learner select a card and SHALL display a single Indonesian word on that card without initially revealing its English meaning.

#### Scenario: Learner opens a card
- **WHEN** a learner selects a word card
- **THEN** the system displays the Indonesian word for that card
- **AND** presents exactly four English answer options, one of which is the correct meaning

#### Scenario: Options are distinct and plausible
- **WHEN** the four English options are generated
- **THEN** all four options are distinct
- **AND** exactly one option is the correct English meaning of the displayed Indonesian word

### Requirement: Reveal picture feedback on each guess
When the learner selects an English option, the system SHALL replace that option's text with a picture representing that English word so the learner can self-assess whether the choice was correct.

#### Scenario: Learner picks an incorrect option
- **WHEN** the learner selects an option that is not the correct meaning
- **THEN** the system replaces that option with its representative picture
- **AND** keeps the remaining unrevealed options selectable
- **AND** does not advance past the guessing step

#### Scenario: Learner picks the correct option
- **WHEN** the learner selects the option that is the correct meaning
- **THEN** the system replaces that option with its representative picture
- **AND** indicates the choice is correct
- **AND** advances the learner to the fingerspelling step for that word

#### Scenario: Guessing loops until correct
- **WHEN** the learner has revealed one or more incorrect options
- **THEN** the system continues to let the learner choose among the remaining options until the correct option is selected

### Requirement: Show the fingerspelling reference for the word
After the correct meaning is chosen, the system SHALL display the ordered fingerspelling reference (one hand-shape image per letter) for the word to be signed.

#### Scenario: Reference shown after correct guess
- **WHEN** the learner reaches the fingerspelling step for a word
- **THEN** the system displays the hand-shape image for each letter of the word in order

### Requirement: Verify the learner's signing before completion
The system SHALL require the learner to fingerspell the word on camera and SHALL only mark the word complete when the signing is verified as correct, delegating capture and per-letter checking to the fingerspelling-recognition capability.

#### Scenario: Correct signing completes the word
- **WHEN** the learner fingerspells every letter of the word and the signing is verified correct
- **THEN** the system marks the word as learned
- **AND** adds the word to the learner's deck

#### Scenario: Incorrect signing does not complete the word
- **WHEN** the learner's signing is not verified as correct
- **THEN** the system keeps the learner on the fingerspelling step
- **AND** does not add the word to the deck
- **AND** allows the learner to try signing again
