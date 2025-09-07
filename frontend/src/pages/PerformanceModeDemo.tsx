/**
 * Performance Mode Demo Page
 * Demonstrates the full-screen performance interface
 */

import React from 'react';
import { PerformanceMode } from '../components/PerformanceMode';

const sampleChordProContent = `{title: Sweet Home Alabama}
{artist: Lynyrd Skynyrd}
{key: D}

{start_of_verse}
[D]Big wheels keep on [C]turning
[G]Carry me home to see my [D]kin
[D]Singing songs about the [C]Southland
[G]I miss Alabamy once a[D]gain
And I think it's a sin, yes
{end_of_verse}

{start_of_chorus}
Well I heard [D]Mister Young sing a[C]bout her
Well, I heard [G]ole Neil put her [D]down
Well, I [D]hope Neil Young will re[C]member
A [G]Southern man don't need him a[D]round anyhow
{end_of_chorus}

{start_of_verse}
[D]Sweet home Ala[C]bama
[G]Where the skies are so [D]blue
[D]Sweet home Ala[C]bama
[G]Lord, I'm coming home to [D]you
{end_of_verse}

{start_of_bridge}
[D]Now Muscle Shoals has got the [C]Swampers
[G]And they've been known to pick a song or [D]two
[D]Lord they get me off so [C]much
[G]They pick me up when I'm feeling [D]blue
Now how about you?
{end_of_bridge}`;

const PerformanceModeDemo: React.FC = () => {
  const handleClose = () => {
    window.location.hash = 'demo';
  };

  return (
    <PerformanceMode
      content={sampleChordProContent}
      onClose={handleClose}
    />
  );
};

export default PerformanceModeDemo;