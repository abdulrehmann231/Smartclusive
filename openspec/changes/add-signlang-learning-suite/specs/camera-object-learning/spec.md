## Purpose

Defines the capture-to-learn flow where a learner photographs a real-world object and the system turns it into a learnable word — detecting the object, showing its Indonesian and English names, and verifying the learner's fingerspelling before adding it to the deck.

## ADDED Requirements

### Requirement: Capture and detect an object with a bounding box
The system SHALL let a learner capture a photo with the camera, SHALL detect the primary object in the image, SHALL show a bounding box around the detected object, and SHALL resolve it to a word. Detection SHALL prioritize common school and daily objects.

#### Scenario: Object is recognized
- **WHEN** a learner captures a photo of an object the system can detect
- **THEN** the system identifies the object, draws a bounding box around it, and resolves it to a single word

#### Scenario: Object is not recognized
- **WHEN** the system cannot confidently detect an object in the photo
- **THEN** the system informs the learner that no object was recognized
- **AND** allows the learner to retake the photo

### Requirement: Support objects beyond a fixed set
Because the objects learners photograph are not a fixed set, the system SHALL provide a fallback detection path that can recognize objects beyond its primary class list while still drawing a bounding box.

#### Scenario: Object outside the primary class list
- **WHEN** a learner captures an object that the primary detector's class list does not include
- **THEN** the system uses the fallback path to identify the object and draw its bounding box

### Requirement: Show Indonesian and English words for the object
Once an object is detected, the system SHALL display both the Indonesian and English words for that object. When the object's word is not in the curated dictionary, the system SHALL obtain the Indonesian word by translating the detected English label.

#### Scenario: Word available in the dictionary
- **WHEN** a detected object exists in the curated dictionary
- **THEN** the system displays the dictionary's Indonesian and English words for that object

#### Scenario: Word obtained by translation
- **WHEN** a detected object is not in the curated dictionary
- **THEN** the system translates the detected English label into Indonesian
- **AND** displays the English label and the translated Indonesian word

### Requirement: Show the fingerspelling reference for the detected word
The system SHALL display the ordered fingerspelling reference (one hand-shape image per letter) for the detected word.

#### Scenario: Reference shown after detection
- **WHEN** the detected word is displayed
- **THEN** the system shows the hand-shape image for each letter of the word in order

### Requirement: Verify signing and add to deck
The system SHALL require the learner to fingerspell the detected word on camera and SHALL only mark it learned when signing is verified correct, delegating capture and per-letter checking to the fingerspelling-recognition capability.

#### Scenario: Correct signing marks the word learned
- **WHEN** the learner fingerspells the detected word and the signing is verified correct
- **THEN** the system marks the word as learned
- **AND** adds the word to the learner's deck

#### Scenario: Duplicate word already in deck
- **WHEN** the detected word is already present in the learner's deck
- **THEN** the system indicates the word is already learned
- **AND** does not create a duplicate deck entry
