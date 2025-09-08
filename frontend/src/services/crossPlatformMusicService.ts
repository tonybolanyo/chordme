// Cross-platform music matching service for Spotify ↔ Apple Music
import type {
  MusicPlatformTrack,
  CrossPlatformMatchRequest,
  CrossPlatformMatchResult,
  UnifiedMusicMetadata,
  SpotifyTrack,
  AppleMusicTrack,
} from '../types';
import { spotifyService } from './spotifyService';
import { appleMusicService } from './appleMusicService';

interface MatchingConfig {
  titleSimilarityThreshold: number;
  artistSimilarityThreshold: number;
  durationToleranceMs: number;
  requireISRC: boolean;
}

class CrossPlatformMusicService {
  private defaultConfig: MatchingConfig = {
    titleSimilarityThreshold: 0.8,
    artistSimilarityThreshold: 0.8,
    durationToleranceMs: 5000, // 5 seconds tolerance
    requireISRC: false,
  };

  /**
   * Match a track from one platform to another
   */
  async matchTrack(request: CrossPlatformMatchRequest): Promise<CrossPlatformMatchResult> {
    const config = { ...this.defaultConfig, ...request.matchCriteria };
    
    try {
      // Search for matches on the target platform
      const searchResults = await this.searchOnPlatform(
        request.track,
        request.targetPlatform
      );

      // Score and rank matches
      const matches = searchResults.map(candidate => ({
        track: candidate,
        confidence: this.calculateMatchConfidence(request.track, candidate, config),
        matchedBy: this.getMatchedCriteria(request.track, candidate, config),
      })).filter(match => match.confidence > 0.3) // Filter out very low confidence matches
        .sort((a, b) => b.confidence - a.confidence);

      // Find the best match
      const bestMatch = matches.length > 0 ? matches[0].track : undefined;

      return {
        sourceTrack: request.track,
        matches,
        bestMatch,
      };
    } catch (error) {
      console.error('Failed to match track:', error);
      throw new Error(`Failed to match track on ${request.targetPlatform}`);
    }
  }

  /**
   * Search for a track on a specific platform
   */
  private async searchOnPlatform(
    track: MusicPlatformTrack,
    platform: 'spotify' | 'apple-music'
  ): Promise<MusicPlatformTrack[]> {
    const searchQuery = this.buildSearchQuery(track);

    if (platform === 'spotify') {
      const results = await spotifyService.search({
        query: searchQuery,
        type: 'track',
        limit: 20,
      });

      return results.tracks?.items.map(t => this.convertSpotifyTrack(t)) || [];
    } else {
      const results = await appleMusicService.search({
        term: searchQuery,
        types: ['songs'],
        limit: 20,
      });

      return results.results.songs?.data.map(t => appleMusicService.convertToPlatformTrack(t)) || [];
    }
  }

  /**
   * Build a search query from track information
   */
  private buildSearchQuery(track: MusicPlatformTrack): string {
    // Start with basic track and artist name
    let query = `track:"${track.name}" artist:"${track.artistName}"`;
    
    // Add album if available for better matching
    if (track.albumName) {
      query += ` album:"${track.albumName}"`;
    }

    return query;
  }

  /**
   * Calculate match confidence between two tracks
   */
  private calculateMatchConfidence(
    source: MusicPlatformTrack,
    candidate: MusicPlatformTrack,
    config: MatchingConfig
  ): number {
    let confidence = 0;
    let factors = 0;

    // ISRC matching (highest confidence)
    if (source.isrc && candidate.isrc) {
      factors++;
      if (source.isrc === candidate.isrc) {
        confidence += 1.0; // Perfect ISRC match
      }
    } else if (config.requireISRC) {
      return 0; // No match if ISRC is required but missing
    }

    // Title similarity
    const titleSimilarity = this.calculateStringSimilarity(
      this.normalizeString(source.name),
      this.normalizeString(candidate.name)
    );
    if (titleSimilarity >= config.titleSimilarityThreshold) {
      confidence += titleSimilarity * 0.4;
    }
    factors++;

    // Artist similarity
    const artistSimilarity = this.calculateStringSimilarity(
      this.normalizeString(source.artistName),
      this.normalizeString(candidate.artistName)
    );
    if (artistSimilarity >= config.artistSimilarityThreshold) {
      confidence += artistSimilarity * 0.3;
    }
    factors++;

    // Duration similarity
    const durationDiff = Math.abs(source.durationMs - candidate.durationMs);
    if (durationDiff <= config.durationToleranceMs) {
      const durationSimilarity = 1 - (durationDiff / config.durationToleranceMs);
      confidence += durationSimilarity * 0.2;
    }
    factors++;

    // Album similarity (bonus points)
    if (source.albumName && candidate.albumName) {
      const albumSimilarity = this.calculateStringSimilarity(
        this.normalizeString(source.albumName),
        this.normalizeString(candidate.albumName)
      );
      if (albumSimilarity > 0.7) {
        confidence += albumSimilarity * 0.1;
      }
    }

    return factors > 0 ? confidence / factors : 0;
  }

  /**
   * Get criteria that matched between two tracks
   */
  private getMatchedCriteria(
    source: MusicPlatformTrack,
    candidate: MusicPlatformTrack,
    config: MatchingConfig
  ): ('isrc' | 'title' | 'artist' | 'duration' | 'combined')[] {
    const criteria: ('isrc' | 'title' | 'artist' | 'duration' | 'combined')[] = [];

    // Check ISRC match
    if (source.isrc && candidate.isrc && source.isrc === candidate.isrc) {
      criteria.push('isrc');
    }

    // Check title similarity
    const titleSimilarity = this.calculateStringSimilarity(
      this.normalizeString(source.name),
      this.normalizeString(candidate.name)
    );
    if (titleSimilarity >= config.titleSimilarityThreshold) {
      criteria.push('title');
    }

    // Check artist similarity
    const artistSimilarity = this.calculateStringSimilarity(
      this.normalizeString(source.artistName),
      this.normalizeString(candidate.artistName)
    );
    if (artistSimilarity >= config.artistSimilarityThreshold) {
      criteria.push('artist');
    }

    // Check duration similarity
    const durationDiff = Math.abs(source.durationMs - candidate.durationMs);
    if (durationDiff <= config.durationToleranceMs) {
      criteria.push('duration');
    }

    // If multiple criteria match, add combined
    if (criteria.length > 1) {
      criteria.push('combined');
    }

    return criteria;
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1;
    if (str1.length === 0 || str2.length === 0) return 0;

    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + substitutionCost // substitution
        );
      }
    }

    const maxLength = Math.max(str1.length, str2.length);
    const distance = matrix[str2.length][str1.length];
    return 1 - distance / maxLength;
  }

  /**
   * Normalize string for comparison
   */
  private normalizeString(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Convert Spotify track to platform-agnostic format
   */
  private convertSpotifyTrack(track: SpotifyTrack): MusicPlatformTrack {
    return {
      platform: 'spotify',
      id: track.id,
      name: track.name,
      artistName: track.artists.map(a => a.name).join(', '),
      albumName: track.album.name,
      durationMs: track.duration_ms,
      previewUrl: track.preview_url,
      externalUrl: track.external_urls?.spotify,
      artwork: track.album.images.length > 0 ? {
        url: track.album.images[0].url,
        width: track.album.images[0].width,
        height: track.album.images[0].height,
      } : undefined,
    };
  }

  /**
   * Create unified metadata from platform tracks
   */
  async createUnifiedMetadata(
    spotifyTrack?: SpotifyTrack,
    appleMusicTrack?: AppleMusicTrack
  ): Promise<UnifiedMusicMetadata> {
    const platforms: UnifiedMusicMetadata['platforms'] = {};
    
    if (spotifyTrack) {
      platforms.spotify = spotifyTrack;
    }
    
    if (appleMusicTrack) {
      platforms.appleMusic = appleMusicTrack;
    }

    // Use the most complete data for normalized fields
    const primarySource = spotifyTrack || appleMusicTrack;
    if (!primarySource) {
      throw new Error('At least one platform track must be provided');
    }

    const normalized: UnifiedMusicMetadata['normalized'] = {
      title: spotifyTrack?.name || appleMusicTrack!.attributes.name,
      artists: spotifyTrack?.artists.map(a => a.name) || [appleMusicTrack!.attributes.artistName],
      album: spotifyTrack?.album.name || appleMusicTrack!.attributes.albumName,
      durationMs: spotifyTrack?.duration_ms || appleMusicTrack!.attributes.durationInMillis,
      releaseDate: spotifyTrack?.album.release_date || appleMusicTrack?.attributes.releaseDate,
      genres: spotifyTrack?.album ? [] : appleMusicTrack?.attributes.genreNames || [],
      isrc: (spotifyTrack as any)?.external_ids?.isrc || appleMusicTrack?.attributes.isrc,
      artwork: this.getBestArtwork(spotifyTrack, appleMusicTrack),
      previewUrls: {
        spotify: spotifyTrack?.preview_url,
        appleMusic: appleMusicTrack?.attributes.previews?.[0]?.url,
      },
      externalUrls: {
        spotify: spotifyTrack?.external_urls?.spotify,
        appleMusic: appleMusicTrack?.attributes.url,
      },
    };

    return {
      platforms,
      normalized,
    };
  }

  /**
   * Get the best available artwork from both platforms
   */
  private getBestArtwork(
    spotifyTrack?: SpotifyTrack,
    appleMusicTrack?: AppleMusicTrack
  ): UnifiedMusicMetadata['normalized']['artwork'] {
    // Prefer Apple Music artwork as it's typically higher quality
    if (appleMusicTrack?.attributes.artwork) {
      return {
        url: appleMusicTrack.attributes.artwork.url.replace('{w}', '400').replace('{h}', '400'),
        width: appleMusicTrack.attributes.artwork.width,
        height: appleMusicTrack.attributes.artwork.height,
      };
    }

    // Fall back to Spotify artwork
    if (spotifyTrack?.album.images.length) {
      const image = spotifyTrack.album.images[0];
      return {
        url: image.url,
        width: image.width || 400,
        height: image.height || 400,
      };
    }

    return undefined;
  }

  /**
   * Batch match multiple tracks
   */
  async batchMatchTracks(
    tracks: MusicPlatformTrack[],
    targetPlatform: 'spotify' | 'apple-music',
    matchCriteria?: CrossPlatformMatchRequest['matchCriteria']
  ): Promise<CrossPlatformMatchResult[]> {
    const results: CrossPlatformMatchResult[] = [];
    
    // Process in batches to avoid rate limiting
    const batchSize = 5;
    for (let i = 0; i < tracks.length; i += batchSize) {
      const batch = tracks.slice(i, i + batchSize);
      
      const batchPromises = batch.map(track =>
        this.matchTrack({ track, targetPlatform, matchCriteria })
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error(`Failed to match track ${batch[index].name}:`, result.reason);
          // Add empty result for failed matches
          results.push({
            sourceTrack: batch[index],
            matches: [],
            bestMatch: undefined,
          });
        }
      });

      // Add delay between batches to respect rate limits
      if (i + batchSize < tracks.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }
}

export const crossPlatformMusicService = new CrossPlatformMusicService();