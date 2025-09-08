"""
AI Music Insights Service for Backend

Provides server-side music analysis algorithms for comprehensive song analysis
including chord progression analysis, structure detection, and music theory insights.
"""

import re
import json
from typing import Dict, List, Optional, Tuple, Any, Set
from dataclasses import dataclass, asdict
from enum import Enum
from collections import Counter, defaultdict


class SectionType(Enum):
    """Enumeration for song section types"""
    VERSE = "verse"
    CHORUS = "chorus"
    BRIDGE = "bridge"
    INTRO = "intro"
    OUTRO = "outro"
    PRE_CHORUS = "pre-chorus"
    INSTRUMENTAL = "instrumental"
    UNKNOWN = "unknown"


class GenreType(Enum):
    """Enumeration for musical genres"""
    POP = "Pop"
    ROCK = "Rock"
    JAZZ = "Jazz"
    BLUES = "Blues"
    FOLK = "Folk"
    COUNTRY = "Country"
    CLASSICAL = "Classical"
    UNKNOWN = "Unknown"


class ComplexityLevel(Enum):
    """Enumeration for musical complexity levels"""
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERT = "expert"


@dataclass
class ChordAnalysis:
    """Analysis of a single chord"""
    chord: str
    root: str
    quality: str
    extensions: List[str]
    is_complex: bool
    complexity_score: float


@dataclass
class ProgressionPattern:
    """Represents a chord progression pattern"""
    name: str
    pattern: List[int]
    description: str
    confidence: float
    genre_associations: List[str]


@dataclass
class SongSection:
    """Represents a section of a song"""
    type: SectionType
    number: Optional[int]
    start_line: int
    end_line: int
    chords: List[str]
    lyrics: List[str]
    confidence: float


@dataclass
class KeySignature:
    """Represents a musical key signature"""
    sharps: int
    flats: int
    accidentals: List[str]


@dataclass
class KeyAnalysis:
    """Analysis of musical key"""
    key: str
    root: str
    mode: str
    confidence: float
    alternatives: List[Dict[str, Any]]
    signature: KeySignature


@dataclass
class ComplexityAnalysis:
    """Analysis of musical complexity"""
    overall_score: float
    chord_complexity: float
    harmonic_complexity: float
    rhythmic_complexity: float
    structure_complexity: float
    difficulty_level: ComplexityLevel
    factors: List[Dict[str, Any]]


@dataclass
class GenreCharacteristic:
    """Represents a musical characteristic that indicates genre"""
    name: str
    strength: float
    description: str


@dataclass
class GenreAnalysis:
    """Analysis of musical genre"""
    primary_genre: GenreType
    confidence: float
    alternative_genres: List[Dict[str, Any]]
    characteristics: List[GenreCharacteristic]


@dataclass
class HarmonicAnalysis:
    """Comprehensive harmonic analysis"""
    chord_functions: List[Dict[str, Any]]
    cadences: List[Dict[str, Any]]
    modulations: List[Dict[str, Any]]
    harmonic_rhythm: Dict[str, Any]
    suggestions: List[Dict[str, Any]]


@dataclass
class MusicInsights:
    """Comprehensive music insights result"""
    title: Optional[str]
    artist: Optional[str]
    analyzed_at: str
    chord_progression: List[Dict[str, Any]]
    structure: Dict[str, Any]
    key: KeyAnalysis
    complexity: ComplexityAnalysis
    genre: GenreAnalysis
    harmony: HarmonicAnalysis
    recommendations: List[Dict[str, Any]]
    overall_confidence: float
    analysis_metrics: Dict[str, Any]


class MusicTheoryAnalyzer:
    """Core music theory analysis algorithms"""
    
    # Musical constants
    CHROMATIC_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    ENHARMONIC_MAP = {
        'C#': 'Db', 'Db': 'C#', 'D#': 'Eb', 'Eb': 'D#',
        'F#': 'Gb', 'Gb': 'F#', 'G#': 'Ab', 'Ab': 'G#',
        'A#': 'Bb', 'Bb': 'A#'
    }
    
    # Scale intervals
    MAJOR_INTERVALS = [0, 2, 4, 5, 7, 9, 11]
    MINOR_INTERVALS = [0, 2, 3, 5, 7, 8, 10]
    
    # Common chord progressions
    COMMON_PROGRESSIONS = {
        'I-V-vi-IV': ([0, 7, 9, 5], 'Popular pop progression', ['Pop', 'Rock']),
        'ii-V-I': ([2, 7, 0], 'Jazz cadence', ['Jazz']),
        'vi-IV-I-V': ([9, 5, 0, 7], 'Descending progression', ['Pop', 'Rock']),
        'I-vi-ii-V': ([0, 9, 2, 7], 'Circle of fifths', ['Jazz', 'Classical']),
        'I-IV-V-I': ([0, 5, 7, 0], 'Classic progression', ['Folk', 'Country', 'Blues']),
        'Blues': ([0, 0, 0, 0, 5, 5, 0, 0, 7, 5, 0, 7], '12-bar blues', ['Blues', 'Rock'])
    }
    
    def __init__(self):
        """Initialize the music theory analyzer"""
        self.chord_complexity_cache = {}
        self.key_detection_cache = {}

    def parse_chordpro_content(self, content: str) -> Dict[str, Any]:
        """Parse ChordPro content and extract musical information"""
        lines = content.split('\n')
        
        # Extract metadata
        title = self._extract_metadata(content, 'title')
        artist = self._extract_metadata(content, 'artist')
        key = self._extract_metadata(content, 'key')
        
        # Extract chords and structure
        chords = self._extract_chords(content)
        sections = self._extract_sections(lines)
        
        return {
            'title': title,
            'artist': artist,
            'declared_key': key,
            'chords': chords,
            'sections': sections,
            'content': content
        }

    def _extract_metadata(self, content: str, field: str) -> Optional[str]:
        """Extract metadata field from ChordPro content"""
        pattern = rf'\{{{field}:\s*([^}}]+)\}}'
        match = re.search(pattern, content, re.IGNORECASE)
        return match.group(1).strip() if match else None

    def _extract_chords(self, content: str) -> List[str]:
        """Extract all chords from ChordPro content"""
        chord_pattern = r'\[([^\]]+)\]'
        chords = re.findall(chord_pattern, content)
        return [chord.strip() for chord in chords if chord.strip()]

    def _extract_sections(self, lines: List[str]) -> List[SongSection]:
        """Extract song sections from ChordPro content"""
        sections = []
        current_section = None
        
        for i, line in enumerate(lines):
            line = line.strip()
            
            # Detect section markers
            start_match = re.match(r'\{start_of_(\w+)(?:\s*:\s*(\d+))?\}', line, re.IGNORECASE)
            end_match = re.match(r'\{end_of_(\w+)\}', line, re.IGNORECASE)
            simple_match = re.match(r'\{(\w+)\}', line, re.IGNORECASE)
            
            if start_match:
                section_type = self._normalize_section_type(start_match.group(1))
                section_number = int(start_match.group(2)) if start_match.group(2) else None
                
                current_section = {
                    'type': section_type,
                    'number': section_number,
                    'start_line': i,
                    'chords': [],
                    'lyrics': [],
                    'confidence': 0.9
                }
                
            elif end_match and current_section:
                current_section['end_line'] = i
                sections.append(SongSection(**current_section))
                current_section = None
                
            elif simple_match and not start_match and not end_match:
                # Simple section reference (like {chorus})
                section_type = self._normalize_section_type(simple_match.group(1))
                sections.append(SongSection(
                    type=section_type,
                    number=None,
                    start_line=i,
                    end_line=i,
                    chords=[],
                    lyrics=[],
                    confidence=0.7
                ))
                
            elif current_section:
                # Add content to current section
                chords = re.findall(r'\[([^\]]+)\]', line)
                current_section['chords'].extend(chords)
                
                lyrics = re.sub(r'\[([^\]]+)\]', '', line).strip()
                if lyrics:
                    current_section['lyrics'].append(lyrics)
        
        # Close any open section
        if current_section:
            current_section['end_line'] = len(lines) - 1
            sections.append(SongSection(**current_section))
        
        return sections

    def _normalize_section_type(self, section_name: str) -> SectionType:
        """Normalize section type name"""
        name_lower = section_name.lower()
        
        type_map = {
            'verse': SectionType.VERSE,
            'chorus': SectionType.CHORUS,
            'bridge': SectionType.BRIDGE,
            'intro': SectionType.INTRO,
            'outro': SectionType.OUTRO,
            'prechorus': SectionType.PRE_CHORUS,
            'pre_chorus': SectionType.PRE_CHORUS,
            'instrumental': SectionType.INSTRUMENTAL,
            'interlude': SectionType.INSTRUMENTAL,
            'solo': SectionType.INSTRUMENTAL
        }
        
        return type_map.get(name_lower, SectionType.UNKNOWN)

    def analyze_chord_progression(self, chords: List[str], key: Optional[str] = None) -> List[Dict[str, Any]]:
        """Analyze chord progressions in the given sequence"""
        if not chords:
            return []
        
        # Detect key if not provided
        if not key:
            key = self.detect_key(chords)
        
        # Convert chords to scale degrees
        scale_degrees = self._chords_to_scale_degrees(chords, key)
        
        progressions = []
        
        # Check for common progressions
        for name, (pattern, description, genres) in self.COMMON_PROGRESSIONS.items():
            matches = self._find_progression_matches(scale_degrees, pattern)
            
            for match in matches:
                progressions.append({
                    'name': name,
                    'pattern': '-'.join(map(str, pattern)),
                    'description': description,
                    'confidence': match['confidence'],
                    'key': key,
                    'roman_numerals': self._scale_degrees_to_roman_numerals(pattern),
                    'functional_labels': self._get_functional_labels(pattern),
                    'genre_associations': genres
                })
        
        # If no common progressions found, analyze custom progression
        if not progressions:
            progressions.append(self._analyze_custom_progression(scale_degrees, key))
        
        return progressions

    def detect_key(self, chords: List[str]) -> str:
        """Detect the most likely key of the chord progression"""
        if not chords:
            return 'C major'
        
        # Cache key for performance
        chord_signature = '|'.join(sorted(set(chords)))
        if chord_signature in self.key_detection_cache:
            return self.key_detection_cache[chord_signature]
        
        key_scores = {}
        
        # Test all major and minor keys
        for root in self.CHROMATIC_NOTES:
            for mode, intervals in [('major', self.MAJOR_INTERVALS), ('minor', self.MINOR_INTERVALS)]:
                key_name = f"{root} {mode}"
                score = self._calculate_key_score(chords, root, intervals)
                key_scores[key_name] = score
        
        # Find the best key
        best_key = max(key_scores.items(), key=lambda x: x[1])[0]
        
        self.key_detection_cache[chord_signature] = best_key
        return best_key

    def _calculate_key_score(self, chords: List[str], root: str, intervals: List[int]) -> float:
        """Calculate how well chords fit a given key"""
        root_index = self.CHROMATIC_NOTES.index(root)
        scale_notes = [(root_index + interval) % 12 for interval in intervals]
        
        score = 0
        for chord in chords:
            chord_root = self._extract_chord_root(chord)
            if chord_root:
                chord_index = self.CHROMATIC_NOTES.index(chord_root)
                if chord_index in scale_notes:
                    # Bonus for tonic, dominant, subdominant
                    if chord_index == root_index:  # Tonic
                        score += 3
                    elif chord_index == (root_index + 7) % 12:  # Dominant
                        score += 2
                    elif chord_index == (root_index + 5) % 12:  # Subdominant
                        score += 2
                    else:
                        score += 1
        
        return score / len(chords) if chords else 0

    def _extract_chord_root(self, chord: str) -> Optional[str]:
        """Extract the root note from a chord symbol"""
        match = re.match(r'^([A-G][#b]?)', chord)
        return match.group(1) if match else None

    def _chords_to_scale_degrees(self, chords: List[str], key: str) -> List[int]:
        """Convert chord sequence to scale degrees based on key"""
        key_root = key.split()[0]
        root_index = self.CHROMATIC_NOTES.index(key_root)
        
        scale_degrees = []
        for chord in chords:
            chord_root = self._extract_chord_root(chord)
            if chord_root:
                chord_index = self.CHROMATIC_NOTES.index(chord_root)
                degree = (chord_index - root_index) % 12
                scale_degrees.append(degree)
        
        return scale_degrees

    def _find_progression_matches(self, scale_degrees: List[int], pattern: List[int]) -> List[Dict[str, Any]]:
        """Find instances of a progression pattern in the scale degrees"""
        matches = []
        pattern_len = len(pattern)
        
        for i in range(len(scale_degrees) - pattern_len + 1):
            segment = scale_degrees[i:i + pattern_len]
            similarity = self._calculate_pattern_similarity(segment, pattern)
            
            if similarity > 0.7:  # Threshold for pattern matching
                matches.append({
                    'position': i,
                    'confidence': similarity,
                    'segment': segment
                })
        
        return matches

    def _calculate_pattern_similarity(self, segment: List[int], pattern: List[int]) -> float:
        """Calculate similarity between two chord patterns"""
        if len(segment) != len(pattern):
            return 0.0
        
        matches = sum(1 for a, b in zip(segment, pattern) if a == b)
        return matches / len(pattern)

    def _scale_degrees_to_roman_numerals(self, degrees: List[int]) -> List[str]:
        """Convert scale degrees to Roman numeral notation"""
        roman_map = {
            0: 'I', 1: 'bII', 2: 'ii', 3: 'bIII', 4: 'iii', 5: 'IV',
            6: 'bV', 7: 'V', 8: 'bVI', 9: 'vi', 10: 'bVII', 11: 'vii°'
        }
        return [roman_map.get(degree, 'I') for degree in degrees]

    def _get_functional_labels(self, degrees: List[int]) -> List[str]:
        """Get functional harmony labels for scale degrees"""
        function_map = {
            0: 'tonic', 2: 'predominant', 4: 'tonic', 5: 'predominant',
            7: 'dominant', 9: 'tonic', 11: 'dominant'
        }
        return [function_map.get(degree, 'other') for degree in degrees]

    def _analyze_custom_progression(self, scale_degrees: List[int], key: str) -> Dict[str, Any]:
        """Analyze a custom chord progression that doesn't match common patterns"""
        return {
            'name': 'Custom Progression',
            'pattern': '-'.join(map(str, scale_degrees)),
            'description': 'Unique chord progression not matching common patterns',
            'confidence': 0.6,
            'key': key,
            'roman_numerals': self._scale_degrees_to_roman_numerals(scale_degrees),
            'functional_labels': self._get_functional_labels(scale_degrees),
            'genre_associations': ['Contemporary']
        }

    def analyze_complexity(self, chords: List[str], sections: List[SongSection]) -> ComplexityAnalysis:
        """Analyze the musical complexity of the song"""
        
        # Chord complexity
        chord_complexity = self._calculate_chord_complexity(chords)
        
        # Harmonic complexity
        harmonic_complexity = self._calculate_harmonic_complexity(chords)
        
        # Rhythmic complexity (basic implementation)
        rhythmic_complexity = self._calculate_rhythmic_complexity(sections)
        
        # Structure complexity
        structure_complexity = self._calculate_structure_complexity(sections)
        
        # Overall score
        overall_score = (
            chord_complexity * 0.3 +
            harmonic_complexity * 0.3 +
            rhythmic_complexity * 0.2 +
            structure_complexity * 0.2
        )
        
        # Determine difficulty level
        difficulty_level = self._score_to_difficulty_level(overall_score)
        
        # Generate complexity factors
        factors = self._generate_complexity_factors(
            chords, sections, chord_complexity, harmonic_complexity,
            rhythmic_complexity, structure_complexity
        )
        
        return ComplexityAnalysis(
            overall_score=overall_score,
            chord_complexity=chord_complexity,
            harmonic_complexity=harmonic_complexity,
            rhythmic_complexity=rhythmic_complexity,
            structure_complexity=structure_complexity,
            difficulty_level=difficulty_level,
            factors=factors
        )

    def _calculate_chord_complexity(self, chords: List[str]) -> float:
        """Calculate complexity based on chord types"""
        if not chords:
            return 0.0
        
        complexity_sum = 0
        for chord in chords:
            complexity_sum += self._get_chord_complexity_score(chord)
        
        return min(1.0, complexity_sum / len(chords))

    def _get_chord_complexity_score(self, chord: str) -> float:
        """Get complexity score for a single chord"""
        if chord in self.chord_complexity_cache:
            return self.chord_complexity_cache[chord]
        
        score = 0.1  # Base score for any chord
        
        # Basic triads: low complexity
        if re.match(r'^[A-G][#b]?m?$', chord):
            score = 0.1
        # Seventh chords: medium complexity
        elif re.search(r'7', chord):
            score = 0.3
            # Dominant 7th alterations
            if re.search(r'[#b](5|9|11)', chord):
                score += 0.2
        # Extended chords: high complexity
        elif re.search(r'(9|11|13)', chord):
            score = 0.5
            # Add complexity for alterations
            if re.search(r'[#b]', chord):
                score += 0.1
        # Complex jazz chords
        elif re.search(r'(maj7|add|sus)', chord):
            score = 0.4
        else:
            score = 0.7  # Unknown complex chord
        
        self.chord_complexity_cache[chord] = score
        return score

    def _calculate_harmonic_complexity(self, chords: List[str]) -> float:
        """Calculate harmonic complexity based on chord relationships"""
        unique_chords = len(set(chords))
        total_chords = len(chords)
        
        if total_chords == 0:
            return 0.0
        
        # Variety factor
        variety_score = min(1.0, unique_chords / 12)  # Normalize to max 12 different chords
        
        # Analyze chord transitions for harmonic sophistication
        transition_score = self._analyze_chord_transitions(chords)
        
        return (variety_score * 0.6 + transition_score * 0.4)

    def _analyze_chord_transitions(self, chords: List[str]) -> float:
        """Analyze the sophistication of chord transitions"""
        if len(chords) < 2:
            return 0.0
        
        sophisticated_transitions = 0
        total_transitions = len(chords) - 1
        
        for i in range(len(chords) - 1):
            current_chord = chords[i]
            next_chord = chords[i + 1]
            
            # Check for sophisticated transitions
            if self._is_sophisticated_transition(current_chord, next_chord):
                sophisticated_transitions += 1
        
        return sophisticated_transitions / total_transitions

    def _is_sophisticated_transition(self, chord1: str, chord2: str) -> bool:
        """Determine if a chord transition is sophisticated"""
        # This is a simplified implementation
        # Real implementation would analyze voice leading, tritone substitutions, etc.
        
        # Different chord types indicate sophistication
        if self._get_chord_complexity_score(chord1) > 0.3 or \
           self._get_chord_complexity_score(chord2) > 0.3:
            return True
        
        # Different roots (not too common) can indicate sophistication
        root1 = self._extract_chord_root(chord1)
        root2 = self._extract_chord_root(chord2)
        
        if root1 and root2 and root1 != root2:
            # Tritone substitution or chromatic movement
            interval = abs(self.CHROMATIC_NOTES.index(root1) - self.CHROMATIC_NOTES.index(root2))
            if interval == 6 or interval == 1:  # Tritone or semitone
                return True
        
        return False

    def _calculate_rhythmic_complexity(self, sections: List[SongSection]) -> float:
        """Calculate rhythmic complexity based on chord density"""
        if not sections:
            return 0.0
        
        total_chords = sum(len(section.chords) for section in sections)
        total_lines = sum(section.end_line - section.start_line + 1 for section in sections)
        
        if total_lines == 0:
            return 0.0
        
        chords_per_line = total_chords / total_lines
        
        # Normalize: more than 4 chords per line is complex
        return min(1.0, chords_per_line / 4.0)

    def _calculate_structure_complexity(self, sections: List[SongSection]) -> float:
        """Calculate structural complexity based on section variety"""
        if not sections:
            return 0.0
        
        unique_section_types = len(set(section.type for section in sections))
        total_sections = len(sections)
        
        # More unique section types = higher complexity
        variety_score = min(1.0, unique_section_types / 6)  # Max 6 common section types
        
        # Repetition patterns
        repetition_score = 1.0 - (total_sections - unique_section_types) / total_sections
        
        return (variety_score * 0.7 + repetition_score * 0.3)

    def _score_to_difficulty_level(self, score: float) -> ComplexityLevel:
        """Convert complexity score to difficulty level"""
        if score < 0.3:
            return ComplexityLevel.BEGINNER
        elif score < 0.6:
            return ComplexityLevel.INTERMEDIATE
        elif score < 0.8:
            return ComplexityLevel.ADVANCED
        else:
            return ComplexityLevel.EXPERT

    def _generate_complexity_factors(
        self, chords: List[str], sections: List[SongSection],
        chord_complexity: float, harmonic_complexity: float,
        rhythmic_complexity: float, structure_complexity: float
    ) -> List[Dict[str, Any]]:
        """Generate detailed complexity factors"""
        factors = []
        
        # Chord complexity factors
        unique_chords = len(set(chords))
        factors.append({
            'name': 'Chord Variety',
            'description': f'Uses {unique_chords} unique chords',
            'impact': chord_complexity,
            'category': 'chord'
        })
        
        # Extended chords
        extended_chords = [c for c in chords if re.search(r'(7|9|11|13)', c)]
        if extended_chords:
            factors.append({
                'name': 'Extended Chords',
                'description': f'Contains {len(extended_chords)} extended chords',
                'impact': len(extended_chords) / len(chords),
                'category': 'chord'
            })
        
        # Harmonic factors
        factors.append({
            'name': 'Harmonic Sophistication',
            'description': 'Based on chord relationships and progressions',
            'impact': harmonic_complexity,
            'category': 'harmony'
        })
        
        # Rhythmic factors
        factors.append({
            'name': 'Rhythmic Patterns',
            'description': 'Based on chord change frequency',
            'impact': rhythmic_complexity,
            'category': 'rhythm'
        })
        
        # Structure factors
        section_types = len(set(section.type for section in sections))
        factors.append({
            'name': 'Song Structure',
            'description': f'Contains {section_types} different section types',
            'impact': structure_complexity,
            'category': 'structure'
        })
        
        return factors

    def classify_genre(self, chords: List[str], sections: List[SongSection]) -> GenreAnalysis:
        """Classify the musical genre based on chord patterns and structure"""
        
        genre_scores = {}
        characteristics = []
        
        # Analyze for jazz characteristics
        jazz_score = self._calculate_jazz_score(chords)
        genre_scores[GenreType.JAZZ] = jazz_score
        if jazz_score > 0.3:
            characteristics.append(GenreCharacteristic(
                name='Jazz Harmony',
                strength=jazz_score,
                description='Contains extended chords and jazz progressions'
            ))
        
        # Analyze for pop characteristics
        pop_score = self._calculate_pop_score(chords)
        genre_scores[GenreType.POP] = pop_score
        if pop_score > 0.4:
            characteristics.append(GenreCharacteristic(
                name='Pop Structure',
                strength=pop_score,
                description='Uses common pop chord progressions'
            ))
        
        # Analyze for blues characteristics
        blues_score = self._calculate_blues_score(chords)
        genre_scores[GenreType.BLUES] = blues_score
        if blues_score > 0.3:
            characteristics.append(GenreCharacteristic(
                name='Blues Progression',
                strength=blues_score,
                description='Contains blues chord patterns'
            ))
        
        # Analyze for folk characteristics
        folk_score = self._calculate_folk_score(chords)
        genre_scores[GenreType.FOLK] = folk_score
        if folk_score > 0.4:
            characteristics.append(GenreCharacteristic(
                name='Folk Simplicity',
                strength=folk_score,
                description='Uses simple, traditional chord progressions'
            ))
        
        # Analyze for rock characteristics
        rock_score = self._calculate_rock_score(chords)
        genre_scores[GenreType.ROCK] = rock_score
        if rock_score > 0.4:
            characteristics.append(GenreCharacteristic(
                name='Rock Characteristics',
                strength=rock_score,
                description='Contains typical rock chord patterns'
            ))
        
        # Find primary and alternative genres
        sorted_genres = sorted(genre_scores.items(), key=lambda x: x[1], reverse=True)
        primary_genre = sorted_genres[0][0] if sorted_genres[0][1] > 0.2 else GenreType.UNKNOWN
        primary_confidence = sorted_genres[0][1]
        
        alternative_genres = []
        for genre, score in sorted_genres[1:4]:
            if score > 0.1:
                alternative_genres.append({
                    'genre': genre.value,
                    'confidence': score,
                    'reasoning': self._get_genre_reasoning(genre, score)
                })
        
        return GenreAnalysis(
            primary_genre=primary_genre,
            confidence=primary_confidence,
            alternative_genres=alternative_genres,
            characteristics=characteristics
        )

    def _calculate_jazz_score(self, chords: List[str]) -> float:
        """Calculate likelihood of jazz genre"""
        if not chords:
            return 0.0
        
        jazz_elements = 0
        for chord in chords:
            # Seventh chords
            if re.search(r'7', chord):
                jazz_elements += 1
            # Extended chords
            if re.search(r'(9|11|13)', chord):
                jazz_elements += 2
            # Altered chords
            if re.search(r'[#b](5|9|11)', chord):
                jazz_elements += 2
        
        return min(1.0, jazz_elements / (len(chords) * 2))

    def _calculate_pop_score(self, chords: List[str]) -> float:
        """Calculate likelihood of pop genre"""
        if not chords:
            return 0.0
        
        # Simple chords indicate pop
        simple_chords = len([c for c in chords if re.match(r'^[A-G][#b]?m?$', c)])
        
        # Check for common pop progressions
        progression_score = 0
        chord_sequence = ' '.join(chords)
        
        # I-V-vi-IV pattern variations
        pop_patterns = ['C G Am F', 'G D Em C', 'D A Bm G', 'F C Dm Bb']
        for pattern in pop_patterns:
            if pattern in chord_sequence:
                progression_score += 0.5
        
        simplicity_score = simple_chords / len(chords)
        return min(1.0, (simplicity_score * 0.7 + progression_score * 0.3))

    def _calculate_blues_score(self, chords: List[str]) -> float:
        """Calculate likelihood of blues genre"""
        if not chords:
            return 0.0
        
        # Dominant 7th chords are common in blues
        dominant_sevenths = len([c for c in chords if re.match(r'^[A-G][#b]?7$', c)])
        
        # Check for 12-bar blues pattern
        blues_pattern_score = 0
        if len(chords) >= 12:
            # Simplified 12-bar blues check
            first_chord = chords[0] if chords else ''
            fourth_chord_expected = self._get_fourth_chord(first_chord)
            fifth_chord_expected = self._get_fifth_chord(first_chord)
            
            if fourth_chord_expected in chords and fifth_chord_expected in chords:
                blues_pattern_score = 0.6
        
        dominant_score = dominant_sevenths / len(chords)
        return min(1.0, (dominant_score * 0.6 + blues_pattern_score * 0.4))

    def _calculate_folk_score(self, chords: List[str]) -> float:
        """Calculate likelihood of folk genre"""
        if not chords:
            return 0.0
        
        # Common folk chords
        folk_chords = {'C', 'D', 'E', 'F', 'G', 'A', 'Am', 'Dm', 'Em'}
        folk_chord_count = len([c for c in chords if c in folk_chords])
        
        return folk_chord_count / len(chords)

    def _calculate_rock_score(self, chords: List[str]) -> float:
        """Calculate likelihood of rock genre"""
        if not chords:
            return 0.0
        
        # Power chords and basic triads
        rock_patterns = 0
        for chord in chords:
            if re.match(r'^[A-G][#b]?5?$', chord):  # Power chords or basic triads
                rock_patterns += 1
            elif re.match(r'^[A-G][#b]?m$', chord):  # Minor chords
                rock_patterns += 1
        
        return rock_patterns / len(chords)

    def _get_fourth_chord(self, root_chord: str) -> str:
        """Get the fourth degree chord for blues progression"""
        root = self._extract_chord_root(root_chord)
        if not root:
            return ''
        
        root_index = self.CHROMATIC_NOTES.index(root)
        fourth_index = (root_index + 5) % 12
        fourth_note = self.CHROMATIC_NOTES[fourth_index]
        
        return f"{fourth_note}7" if '7' in root_chord else fourth_note

    def _get_fifth_chord(self, root_chord: str) -> str:
        """Get the fifth degree chord for blues progression"""
        root = self._extract_chord_root(root_chord)
        if not root:
            return ''
        
        root_index = self.CHROMATIC_NOTES.index(root)
        fifth_index = (root_index + 7) % 12
        fifth_note = self.CHROMATIC_NOTES[fifth_index]
        
        return f"{fifth_note}7" if '7' in root_chord else fifth_note

    def _get_genre_reasoning(self, genre: GenreType, score: float) -> str:
        """Get reasoning for genre classification"""
        if score > 0.7:
            return f"Strong {genre.value.lower()} characteristics"
        elif score > 0.4:
            return f"Some {genre.value.lower()} elements"
        else:
            return f"Weak {genre.value.lower()} similarity"


class AIMusicInsightsService:
    """Main service class for AI-powered music insights"""
    
    def __init__(self):
        self.analyzer = MusicTheoryAnalyzer()
    
    def analyze_song(self, content: str, options: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Analyze a song comprehensively and return insights"""
        if not content or not content.strip():
            raise ValueError("Content cannot be empty")
        
        options = options or {}
        start_time = time.time()
        
        try:
            # Parse content
            parsed = self.analyzer.parse_chordpro_content(content)
            
            if not parsed['chords']:
                raise ValueError("No chords detected in content")
            
            # Perform analysis
            chord_progression = self.analyzer.analyze_chord_progression(
                parsed['chords'], parsed['declared_key']
            )
            
            # Detect key
            detected_key = self.analyzer.detect_key(parsed['chords'])
            key_analysis = self._create_key_analysis(detected_key)
            
            # Analyze complexity
            complexity = self.analyzer.analyze_complexity(parsed['chords'], parsed['sections'])
            
            # Classify genre
            genre = self.analyzer.classify_genre(parsed['chords'], parsed['sections'])
            
            # Create structure analysis
            structure_analysis = self._create_structure_analysis(parsed['sections'])
            
            # Generate recommendations
            recommendations = self._generate_recommendations(
                chord_progression, complexity, genre, options.get('user_skill_level', 'intermediate')
            )
            
            # Calculate overall confidence
            confidence_scores = [
                prog.get('confidence', 0) for prog in chord_progression
            ] + [key_analysis.confidence, complexity.overall_score, genre.confidence]
            
            overall_confidence = sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0
            
            processing_time = time.time() - start_time
            
            return {
                'title': parsed['title'],
                'artist': parsed['artist'],
                'analyzed_at': time.strftime('%Y-%m-%dT%H:%M:%SZ'),
                'chord_progression': chord_progression,
                'structure': structure_analysis,
                'key': asdict(key_analysis),
                'complexity': asdict(complexity),
                'genre': asdict(genre),
                'harmony': self._create_harmony_analysis(parsed['chords']),
                'recommendations': recommendations,
                'overall_confidence': overall_confidence,
                'analysis_metrics': {
                    'processing_time': processing_time,
                    'algorithms_used': self._get_algorithms_used(options),
                    'data_quality': self._assess_data_quality(parsed)
                }
            }
            
        except Exception as e:
            raise ValueError(f"Analysis failed: {str(e)}")
    
    def _create_key_analysis(self, key: str) -> KeyAnalysis:
        """Create detailed key analysis"""
        parts = key.split()
        root = parts[0]
        mode = parts[1] if len(parts) > 1 else 'major'
        
        # Create signature
        signature = self._get_key_signature(root, mode)
        
        # Generate alternatives (simplified)
        alternatives = [
            {'key': f"{root} minor" if mode == 'major' else f"{root} major", 'confidence': 0.6},
            {'key': 'C major', 'confidence': 0.4} if key != 'C major' else {'key': 'G major', 'confidence': 0.4}
        ]
        
        return KeyAnalysis(
            key=key,
            root=root,
            mode=mode,
            confidence=0.8,
            alternatives=alternatives,
            signature=signature
        )
    
    def _get_key_signature(self, root: str, mode: str) -> KeySignature:
        """Get key signature for the given key"""
        # Simplified key signature calculation
        key_signatures = {
            'C major': (0, 0, []),
            'G major': (1, 0, ['F#']),
            'D major': (2, 0, ['F#', 'C#']),
            'A major': (3, 0, ['F#', 'C#', 'G#']),
            'E major': (4, 0, ['F#', 'C#', 'G#', 'D#']),
            'B major': (5, 0, ['F#', 'C#', 'G#', 'D#', 'A#']),
            'F# major': (6, 0, ['F#', 'C#', 'G#', 'D#', 'A#', 'E#']),
            'F major': (0, 1, ['Bb']),
            'Bb major': (0, 2, ['Bb', 'Eb']),
            'Eb major': (0, 3, ['Bb', 'Eb', 'Ab']),
            'Ab major': (0, 4, ['Bb', 'Eb', 'Ab', 'Db']),
            'Db major': (0, 5, ['Bb', 'Eb', 'Ab', 'Db', 'Gb']),
            'A minor': (0, 0, []),
            'E minor': (1, 0, ['F#']),
            'B minor': (2, 0, ['F#', 'C#']),
            'F# minor': (3, 0, ['F#', 'C#', 'G#']),
            'C# minor': (4, 0, ['F#', 'C#', 'G#', 'D#']),
            'G# minor': (5, 0, ['F#', 'C#', 'G#', 'D#', 'A#']),
            'D# minor': (6, 0, ['F#', 'C#', 'G#', 'D#', 'A#', 'E#']),
            'D minor': (0, 1, ['Bb']),
            'G minor': (0, 2, ['Bb', 'Eb']),
            'C minor': (0, 3, ['Bb', 'Eb', 'Ab']),
            'F minor': (0, 4, ['Bb', 'Eb', 'Ab', 'Db']),
            'Bb minor': (0, 5, ['Bb', 'Eb', 'Ab', 'Db', 'Gb'])
        }
        
        key_name = f"{root} {mode}"
        sharps, flats, accidentals = key_signatures.get(key_name, (0, 0, []))
        
        return KeySignature(
            sharps=sharps,
            flats=flats,
            accidentals=accidentals
        )
    
    def _create_structure_analysis(self, sections: List[SongSection]) -> Dict[str, Any]:
        """Create structure analysis from sections"""
        structure_pattern = '-'.join([
            section.type.value[0].upper() + (str(section.number) if section.number else '')
            for section in sections
        ])
        
        return {
            'sections': [asdict(section) for section in sections],
            'structure': structure_pattern,
            'confidence': 0.8,
            'complexity_score': self.analyzer._calculate_structure_complexity(sections),
            'estimated_duration': len(sections) * 30  # 30 seconds per section
        }
    
    def _create_harmony_analysis(self, chords: List[str]) -> Dict[str, Any]:
        """Create basic harmony analysis"""
        return {
            'chord_functions': [],
            'cadences': [],
            'modulations': [],
            'harmonic_rhythm': {
                'changes_per_measure': len(chords) / max(1, len(chords) // 4),
                'pattern': 'moderate',
                'accelerations': []
            },
            'suggestions': []
        }
    
    def _generate_recommendations(
        self, progressions: List[Dict[str, Any]], complexity: ComplexityAnalysis,
        genre: GenreAnalysis, user_skill_level: str
    ) -> List[Dict[str, Any]]:
        """Generate learning recommendations"""
        recommendations = []
        
        # Complexity-based recommendations
        if complexity.overall_score > 0.7 and user_skill_level == 'beginner':
            recommendations.append({
                'type': 'practice',
                'priority': 'high',
                'title': 'Simplify Chord Progressions',
                'description': 'This song has complex harmonies. Try practicing with simpler chord substitutions first.',
                'estimated_time': '2-3 weeks',
                'difficulty': 'beginner',
                'resources': [{
                    'type': 'tutorial',
                    'title': 'Basic Chord Substitutions',
                    'description': 'Learn simple chord alternatives'
                }]
            })
        
        # Genre-specific recommendations
        if genre.primary_genre == GenreType.JAZZ:
            recommendations.append({
                'type': 'theory',
                'priority': 'medium',
                'title': 'Study Jazz Harmony',
                'description': 'This song uses jazz harmonies. Study extended chords and jazz progressions.',
                'estimated_time': '1-2 months',
                'difficulty': 'intermediate',
                'resources': [{
                    'type': 'tutorial',
                    'title': 'Jazz Harmony Fundamentals',
                    'description': 'Understanding jazz chord progressions'
                }]
            })
        
        # Progression-specific recommendations
        for prog in progressions:
            if prog.get('name') == 'ii-V-I':
                recommendations.append({
                    'type': 'theory',
                    'priority': 'medium',
                    'title': 'Master ii-V-I Progressions',
                    'description': 'This song uses ii-V-I progressions. Study jazz harmony to understand these better.',
                    'estimated_time': '1-2 months',
                    'difficulty': 'intermediate'
                })
        
        return recommendations
    
    def _get_algorithms_used(self, options: Dict[str, Any]) -> List[str]:
        """Get list of algorithms used in analysis"""
        algorithms = ['chord_detection', 'structure_analysis', 'key_detection', 'complexity_analysis']
        
        if options.get('enable_genre_classification', True):
            algorithms.append('genre_classification')
        
        if options.get('enable_harmonic_analysis', True):
            algorithms.append('harmonic_analysis')
        
        if options.get('enable_recommendations', True):
            algorithms.append('learning_recommendations')
        
        return algorithms
    
    def _assess_data_quality(self, parsed: Dict[str, Any]) -> float:
        """Assess the quality of input data"""
        quality = 1.0
        
        # Reduce quality for few chords
        if len(parsed['chords']) < 4:
            quality *= 0.7
        
        # Reduce quality for very short content
        if len(parsed['content']) < 100:
            quality *= 0.8
        
        # Bonus for structured content
        if parsed['sections']:
            quality *= 1.1
        
        # Bonus for metadata
        if parsed['title'] or parsed['artist']:
            quality *= 1.05
        
        return min(1.0, quality)


# Export the service
import time
ai_music_insights_service = AIMusicInsightsService()