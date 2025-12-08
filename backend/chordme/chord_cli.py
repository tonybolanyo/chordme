"""
Flask CLI commands for chord database management.
"""

import click
from flask.cli import with_appcontext
from datetime import datetime
import sys
import os

# Add the database directory to Python path so we can import the population script
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'database'))

# Import conditionally to avoid errors when populate_chord_database is not available
try:
    from populate_chord_database import populate_chord_database
except ImportError:
    populate_chord_database = None


@click.command()
@with_appcontext
def populate_chords():
    """Populate the chord database with 200+ essential chords."""
    if populate_chord_database is None:
        click.echo("Error: populate_chord_database module not available")
        return
    click.echo("Starting chord database population...")
    
    try:
        success = populate_chord_database()
        
        if success:
            click.echo("✅ Chord database population completed successfully!")
        else:
            click.echo("❌ Chord database population failed!")
            exit(1)
            
    except Exception as e:
        click.echo(f"❌ Error during chord database population: {str(e)}")
        exit(1)


@click.command()
@with_appcontext  
def chord_stats():
    """Show chord database statistics."""
    from .models import Chord
    import json
    
    try:
        all_chords = Chord.query.all()
        
        if not all_chords:
            click.echo("No chords found in the database.")
            return
        
        stats = {
            'total': len(all_chords),
            'by_instrument': {},
            'by_difficulty': {},
            'verified': 0,
            'custom': 0
        }
        
        for chord in all_chords:
            try:
                chord_data = json.loads(chord.definition)
                
                # Count by instrument
                instrument = chord_data.get('instrument', {}).get('type', 'unknown')
                stats['by_instrument'][instrument] = stats['by_instrument'].get(instrument, 0) + 1
                
                # Count by difficulty
                difficulty = chord_data.get('difficulty', 'unknown')
                stats['by_difficulty'][difficulty] = stats['by_difficulty'].get(difficulty, 0) + 1
                
                # Count verified and custom chords
                metadata = chord_data.get('metadata', {})
                if metadata.get('isVerified', False):
                    stats['verified'] += 1
                if metadata.get('source') == 'user-created':
                    stats['custom'] += 1
                    
            except (json.JSONDecodeError, KeyError):
                continue
        
        click.echo("\n📊 Chord Database Statistics:")
        click.echo(f"   Total chords: {stats['total']}")
        click.echo(f"   Verified chords: {stats['verified']}")
        click.echo(f"   Custom chords: {stats['custom']}")
        
        click.echo("\n🎸 By Instrument:")
        for instrument, count in stats['by_instrument'].items():
            click.echo(f"   {instrument.title()}: {count}")
        
        click.echo("\n📈 By Difficulty:")
        for difficulty, count in stats['by_difficulty'].items():
            click.echo(f"   {difficulty.title()}: {count}")
        
    except Exception as e:
        click.echo(f"❌ Error retrieving chord statistics: {str(e)}")


def init_app(app):
    """Initialize CLI commands with the Flask app."""
    app.cli.add_command(populate_chords)
    app.cli.add_command(chord_stats)