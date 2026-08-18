## Purpose

Formalizes the existing real-time camera translation as a first-class capability: reading signs from the camera and rendering them as Indonesian and English text, reusing the current BISINDO detector. Scoped as review-only in this change.

> **Status: UNDER REVIEW — not implemented in this change.** This capability describes only the isolated-sign behavior the existing detector already supports. Translating Indonesian sign language at the level of arbitrary **words and sentences** has no proven off-the-shelf technology today (the existing model recognizes a fixed, limited vocabulary, and reliable continuous sign-language translation remains an open research problem). Requirements below are documented for review; implementation is deferred pending further research and may be revisited later. See `design.md` → Sign Detection Architecture and Open Questions.

## ADDED Requirements

### Requirement: Translate camera signs to text
The system SHALL detect signs from a live camera stream and SHALL display the recognized meaning as Indonesian text, reusing the existing sign-detection model rather than a newly trained one.

#### Scenario: Sign detected and shown
- **WHEN** a supported sign is performed in front of the camera
- **THEN** the system displays the recognized word as Indonesian text

#### Scenario: Stabilize output over consecutive frames
- **WHEN** a sign is detected consistently across consecutive frames
- **THEN** the system commits the recognized word rather than reacting to a single noisy frame

### Requirement: Show English alongside Indonesian
The system SHALL display the English equivalent alongside the recognized Indonesian text.

#### Scenario: Bilingual output
- **WHEN** a word is recognized and committed
- **THEN** the system displays both its Indonesian and English text

### Requirement: Confidence control
The system SHALL let a user set a detection confidence threshold and SHALL only report signs meeting or exceeding it.

#### Scenario: Below-threshold detections suppressed
- **WHEN** a candidate detection is below the configured confidence threshold
- **THEN** the system does not report that detection as a recognized sign
