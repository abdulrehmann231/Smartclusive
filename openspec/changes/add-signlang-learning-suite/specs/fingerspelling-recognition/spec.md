## Purpose

Defines the shared camera-based capability that captures a learner's ASL hand signs and verifies them against a target — a single letter (A–Z), a single number (0–9), or a whole word signed letter by letter — reused by word-card learning, camera-object learning, quizzes, and video quizzes.

## ADDED Requirements

### Requirement: Request camera access with consent
The system SHALL request camera access before capturing signs and SHALL not capture video until the learner grants permission.

#### Scenario: Permission granted
- **WHEN** a signing step begins and the learner grants camera access
- **THEN** the system begins capturing the camera stream for recognition

#### Scenario: Permission denied
- **WHEN** the learner denies camera access
- **THEN** the system does not capture video
- **AND** informs the learner that signing verification requires the camera

### Requirement: Recognize a single ASL letter
The system SHALL recognize an individual ASL manual-alphabet letter from the camera and SHALL report whether it matches an expected letter. Recognition SHALL run on hand landmarks and MAY use a small classifier trained on public ASL datasets; the hand-detection/landmark model itself is reused, not trained.

#### Scenario: Correct letter signed
- **WHEN** the expected letter is a given letter and the learner signs that letter
- **THEN** the system reports the letter as matched

#### Scenario: Wrong letter signed
- **WHEN** the learner signs a letter different from the expected letter
- **THEN** the system reports the letter as not matched
- **AND** indicates which letter was expected

### Requirement: Recognize a single ASL number
The system SHALL recognize an individual ASL number sign for the digits 0 through 9 from the camera and SHALL report whether it matches an expected number, using the same existing recognition technology as letters.

#### Scenario: Correct number signed
- **WHEN** the expected target is a digit 0–9 and the learner signs that number in ASL
- **THEN** the system reports the number as matched

#### Scenario: Wrong number signed
- **WHEN** the learner signs a number different from the expected digit
- **THEN** the system reports the number as not matched
- **AND** indicates which number was expected

### Requirement: Verify a word letter by letter
The system SHALL verify a target word by checking each of its letters in order and SHALL report the word as correctly signed only when every letter is matched in sequence.

#### Scenario: All letters correct in order
- **WHEN** the learner signs each letter of the target word correctly and in order
- **THEN** the system reports the word as correctly signed

#### Scenario: A letter is signed incorrectly
- **WHEN** the learner signs a letter that does not match the expected next letter of the target word
- **THEN** the system does not report the word as complete
- **AND** indicates the current expected letter so the learner can retry that letter

### Requirement: Verify a multi-digit number as a sequence of digits
The system SHALL verify a two- or three-digit number by treating it as an ordered sequence of single digits (0–9) and checking each digit in order, using the same per-target recognition as single digits. The system SHALL make clear that a multi-digit number is being signed digit by digit.

#### Scenario: Multi-digit number signed correctly
- **WHEN** the target is a multi-digit number and the learner signs each of its digits correctly and in order
- **THEN** the system reports the number as correctly signed

#### Scenario: A digit in the sequence is wrong
- **WHEN** the learner signs a digit that does not match the expected next digit of the number
- **THEN** the system does not report the number as complete
- **AND** indicates the current expected digit so the learner can retry it

### Requirement: Provide progress feedback during signing
The system SHALL indicate signing progress by showing which letters have been matched and which letter is currently expected.

#### Scenario: Progress updates as letters match
- **WHEN** the learner matches the next expected letter of a multi-letter word
- **THEN** the system marks that letter as complete
- **AND** advances the expected letter to the following letter
