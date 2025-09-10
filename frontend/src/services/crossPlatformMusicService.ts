// Universal Music Metadata System - Enhanced cross-platform music service
import type {
  MusicPlatformTrack,
  CrossPlatformMatchRequest,
  CrossPlatformMatchResult,
  UnifiedMusicMetadata,
  SpotifyTrack,
  AppleMusicTrack,
  MetadataSource,
  MetadataQuality,
  MetadataConflict,
} from '../types';
import { spotifyService } from './spotifyService';
import { appleMusicService } from './appleMusicService';

interface MatchingConfig {
  titleSimilarityThreshold: number;
  artistSimilarityThreshold: number;
  durationToleranceMs: number;
  requireISRC: boolean;
}

interface MetadataCacheEntry {
  metadata: UnifiedMusicMetadata;
  cachedAt: number;
  ttl: number; // Time to live in milliseconds
  accessCount: number;
  lastAccessed: number;
}

interface MetadataEnrichmentConfig {
  enabledSources: ('spotify' | 'apple-music')[];
  qualityThreshold: number; // Minimum quality score to accept
  maxSourcesPerField: number;
  conflictResolutionStrategy: 'confidence' | 'majority' | 'newest' | 'manual';
  cacheEnabled: boolean;
  cacheTTL: number; // milliseconds
}

class CrossPlatformMusicService {
  private defaultConfig: MatchingConfig = {
    titleSimilarityThreshold: 0.8,
    artistSimilarityThreshold: 0.8,
    durationToleranceMs: 5000, // 5 seconds tolerance
    requireISRC: false,
  };

  private enrichmentConfig: MetadataEnrichmentConfig = {
    enabledSources: ['spotify', 'apple-music'],
    qualityThreshold: 0.6,
    maxSourcesPerField: 3,
    conflictResolutionStrategy: 'confidence',
    cacheEnabled: true,
    cacheTTL: 24 * 60 * 60 * 1000, // 24 hours
  };

  private metadataCache = new Map<string, MetadataCacheEntry>();
  private readonly maxCacheSize = 1000;

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
   * Create unified metadata from platform tracks with quality scoring and conflict resolution
   */
  async createUnifiedMetadata(
    spotifyTrack?: SpotifyTrack,
    appleMusicTrack?: AppleMusicTrack
  ): Promise<UnifiedMusicMetadata> {
    if (!spotifyTrack && !appleMusicTrack) {
      throw new Error('At least one platform track must be provided');
    }

    // Check cache first
    const cacheKey = this.generateCacheKey(spotifyTrack, appleMusicTrack);
    const cached = this.getCachedMetadata(cacheKey);
    if (cached) {
      return cached;
    }

    // Create metadata sources
    const sources: MetadataSource[] = [];
    if (spotifyTrack) {
      sources.push({
        platform: 'spotify',
        confidence: this.calculateSourceConfidence('spotify', spotifyTrack),
        retrievedAt: new Date().toISOString(),
        dataComplete: this.isDataComplete('spotify', spotifyTrack),
        fields: this.getAvailableFields('spotify', spotifyTrack),
      });
    }
    if (appleMusicTrack) {
      sources.push({
        platform: 'apple-music',
        confidence: this.calculateSourceConfidence('apple-music', appleMusicTrack),
        retrievedAt: new Date().toISOString(),
        dataComplete: this.isDataComplete('apple-music', appleMusicTrack),
        fields: this.getAvailableFields('apple-music', appleMusicTrack),
      });
    }

    // Detect and resolve conflicts
    const conflicts = this.detectConflicts(spotifyTrack, appleMusicTrack);
    const resolvedData = this.resolveConflicts(conflicts, spotifyTrack, appleMusicTrack, sources);

    // Calculate quality metrics
    const quality = this.calculateMetadataQuality(sources, conflicts);

    const platforms: UnifiedMusicMetadata['platforms'] = {};
    if (spotifyTrack) platforms.spotify = spotifyTrack;
    if (appleMusicTrack) platforms.appleMusic = appleMusicTrack;

    const metadata: UnifiedMusicMetadata = {
      platforms,
      normalized: resolvedData,
      quality,
      conflicts,
      lastUpdated: new Date().toISOString(),
      cacheExpiry: new Date(Date.now() + this.enrichmentConfig.cacheTTL).toISOString(),
    };

    // Cache the result
    if (this.enrichmentConfig.cacheEnabled) {
      this.cacheMetadata(cacheKey, metadata);
    }

    return metadata;
  }

  /**
   * Generate cache key for metadata
   */
  private generateCacheKey(spotifyTrack?: SpotifyTrack, appleMusicTrack?: AppleMusicTrack): string {
    const parts = [];
    if (spotifyTrack) parts.push(`spotify:${spotifyTrack.id}`);
    if (appleMusicTrack) parts.push(`apple:${appleMusicTrack.id}`);
    return parts.join('|');
  }

  /**
   * Get cached metadata if available and not expired
   */
  private getCachedMetadata(key: string): UnifiedMusicMetadata | null {
    const entry = this.metadataCache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.cachedAt > entry.ttl) {
      this.metadataCache.delete(key);
      return null;
    }

    entry.lastAccessed = now;
    entry.accessCount++;
    return entry.metadata;
  }

  /**
   * Cache metadata with TTL management
   */
  private cacheMetadata(key: string, metadata: UnifiedMusicMetadata): void {
    // Enforce cache size limit using LRU eviction
    if (this.metadataCache.size >= this.maxCacheSize) {
      this.evictLeastRecentlyUsed();
    }

    this.metadataCache.set(key, {
      metadata,
      cachedAt: Date.now(),
      ttl: this.enrichmentConfig.cacheTTL,
      accessCount: 1,
      lastAccessed: Date.now(),
    });
  }

  /**
   * Evict least recently used cache entries
   */
  private evictLeastRecentlyUsed(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, entry] of this.metadataCache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.metadataCache.delete(oldestKey);
    }
  }

  /**
   * Calculate confidence score for a metadata source
   */
  private calculateSourceConfidence(platform: string, track: unknown): number {
    let confidence = 0.5; // Base confidence

    // Platform-specific confidence adjustments
    if (platform === 'spotify') {
      confidence += 0.2; // Spotify generally has good metadata
      if (track.popularity && track.popularity > 50) confidence += 0.1;
      if (track.external_ids?.isrc) confidence += 0.1;
    } else if (platform === 'apple-music') {
      confidence += 0.15; // Apple Music has decent metadata
      if (track.attributes.isrc) confidence += 0.1;
    }

    // Data completeness affects confidence
    if (this.isDataComplete(platform, track)) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Check if track data is complete
   */
  private isDataComplete(platform: string, track: unknown): boolean {
    if (platform === 'spotify') {
      return !!(track.name && track.artists?.length && track.album?.name && track.duration_ms);
    } else if (platform === 'apple-music') {
      return !!(track.attributes.name && track.attributes.artistName && 
               track.attributes.albumName && track.attributes.durationInMillis);
    }
    return false;
  }

  /**
   * Get available metadata fields from a track
   */
  private getAvailableFields(platform: string, track: unknown): string[] {
    const fields: string[] = [];
    
    if (platform === 'spotify') {
      if (track.name) fields.push('title');
      if (track.artists?.length) fields.push('artists');
      if (track.album?.name) fields.push('album');
      if (track.duration_ms) fields.push('duration');
      if (track.album?.release_date) fields.push('releaseDate');
      if (track.external_ids?.isrc) fields.push('isrc');
      if (track.preview_url) fields.push('previewUrl');
      if (track.explicit !== undefined) fields.push('explicit');
      if (track.popularity !== undefined) fields.push('popularity');
    } else if (platform === 'apple-music') {
      if (track.attributes.name) fields.push('title');
      if (track.attributes.artistName) fields.push('artists');
      if (track.attributes.albumName) fields.push('album');
      if (track.attributes.durationInMillis) fields.push('duration');
      if (track.attributes.releaseDate) fields.push('releaseDate');
      if (track.attributes.genreNames?.length) fields.push('genres');
      if (track.attributes.isrc) fields.push('isrc');
      if (track.attributes.previews?.length) fields.push('previewUrl');
    }
    
    return fields;
  }

  /**
   * Detect conflicts between metadata sources
   */
  private detectConflicts(spotifyTrack?: SpotifyTrack, appleMusicTrack?: AppleMusicTrack): MetadataConflict[] {
    const conflicts: MetadataConflict[] = [];

    if (!spotifyTrack || !appleMusicTrack) {
      return conflicts; // No conflicts if only one source
    }

    // Check title conflicts
    const spotifyTitle = spotifyTrack.name.toLowerCase().trim();
    const appleTitle = appleMusicTrack.attributes.name.toLowerCase().trim();
    if (this.calculateStringSimilarity(spotifyTitle, appleTitle) < 0.9) {
      conflicts.push({
        field: 'title',
        sources: [
          { platform: 'spotify', value: spotifyTrack.name, confidence: 0.8 },
          { platform: 'apple-music', value: appleMusicTrack.attributes.name, confidence: 0.7 }
        ],
        resolution: 'automatic'
      });
    }

    // Check duration conflicts (more than 5 second difference)
    const durationDiff = Math.abs(spotifyTrack.duration_ms - appleMusicTrack.attributes.durationInMillis);
    if (durationDiff > 5000) {
      conflicts.push({
        field: 'duration',
        sources: [
          { platform: 'spotify', value: spotifyTrack.duration_ms, confidence: 0.8 },
          { platform: 'apple-music', value: appleMusicTrack.attributes.durationInMillis, confidence: 0.7 }
        ],
        resolution: 'automatic'
      });
    }

    // Check artist conflicts
    const spotifyArtist = spotifyTrack.artists.map(a => a.name).join(', ').toLowerCase();
    const appleArtist = appleMusicTrack.attributes.artistName.toLowerCase();
    if (this.calculateStringSimilarity(spotifyArtist, appleArtist) < 0.9) {
      conflicts.push({
        field: 'artists',
        sources: [
          { platform: 'spotify', value: spotifyTrack.artists.map(a => a.name), confidence: 0.8 },
          { platform: 'apple-music', value: [appleMusicTrack.attributes.artistName], confidence: 0.7 }
        ],
        resolution: 'automatic'
      });
    }

    return conflicts;
  }

  /**
   * Resolve conflicts using configured strategy
   */
  private resolveConflicts(
    conflicts: MetadataConflict[],
    spotifyTrack?: SpotifyTrack,
    appleMusicTrack?: AppleMusicTrack,
    _sources?: MetadataSource[]
  ): UnifiedMusicMetadata['normalized'] {
    const resolved: UnifiedMusicMetadata['normalized'] = {
      title: '',
      artists: [],
      album: '',
      durationMs: 0,
      releaseDate: undefined,
      genres: [],
      isrc: undefined,
      artwork: undefined,
      previewUrls: {},
      externalUrls: {},
    };

    // Resolve title
    const titleConflict = conflicts.find(c => c.field === 'title');
    if (titleConflict) {
      resolved.title = this.resolveFieldConflict(titleConflict);
      titleConflict.resolvedValue = resolved.title;
      titleConflict.resolutionReason = 'Resolved using confidence-based strategy';
    } else {
      resolved.title = spotifyTrack?.name || appleMusicTrack!.attributes.name;
    }

    // Resolve artists
    const artistConflict = conflicts.find(c => c.field === 'artists');
    if (artistConflict) {
      resolved.artists = this.resolveFieldConflict(artistConflict);
      artistConflict.resolvedValue = resolved.artists;
      artistConflict.resolutionReason = 'Resolved using confidence-based strategy';
    } else {
      resolved.artists = spotifyTrack?.artists.map(a => a.name) || [appleMusicTrack!.attributes.artistName];
    }

    // Resolve duration
    const durationConflict = conflicts.find(c => c.field === 'duration');
    if (durationConflict) {
      resolved.durationMs = this.resolveFieldConflict(durationConflict);
      durationConflict.resolvedValue = resolved.durationMs;
      durationConflict.resolutionReason = 'Selected most accurate duration based on source reliability';
    } else {
      resolved.durationMs = spotifyTrack?.duration_ms || appleMusicTrack!.attributes.durationInMillis;
    }

    // Fill in non-conflicting fields
    resolved.album = spotifyTrack?.album.name || appleMusicTrack!.attributes.albumName;
    resolved.releaseDate = spotifyTrack?.album.release_date || appleMusicTrack?.attributes.releaseDate;
    resolved.genres = appleMusicTrack?.attributes.genreNames || [];
    resolved.isrc = (spotifyTrack as any)?.external_ids?.isrc || appleMusicTrack?.attributes.isrc;
    resolved.artwork = this.getBestArtwork(spotifyTrack, appleMusicTrack);
    resolved.previewUrls = {
      spotify: spotifyTrack?.preview_url,
      appleMusic: appleMusicTrack?.attributes.previews?.[0]?.url,
    };
    resolved.externalUrls = {
      spotify: spotifyTrack?.external_urls?.spotify,
      appleMusic: appleMusicTrack?.attributes.url,
    };

    // Enhanced fields
    resolved.explicit = spotifyTrack?.explicit;
    resolved.popularity = spotifyTrack?.popularity;

    return resolved;
  }

  /**
   * Resolve individual field conflict based on strategy
   */
  private resolveFieldConflict(conflict: MetadataConflict): any {
    switch (this.enrichmentConfig.conflictResolutionStrategy) {
      case 'confidence':
        // Use the value from the source with highest confidence
        const highestConfidence = Math.max(...conflict.sources.map(s => s.confidence));
        const bestSource = conflict.sources.find(s => s.confidence === highestConfidence);
        return bestSource?.value;

      case 'majority':
        // Use the most common value (simple implementation for now)
        const values = conflict.sources.map(s => JSON.stringify(s.value));
        const counts = values.reduce((acc, val) => {
          acc[val] = (acc[val] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        const mostCommon = Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
        return JSON.parse(mostCommon);

      case 'newest':
        // For now, prefer Spotify as it's typically more up-to-date
        const spotifySource = conflict.sources.find(s => s.platform === 'spotify');
        return spotifySource?.value || conflict.sources[0].value;

      case 'manual':
        // Mark for manual resolution - for now, fall back to confidence
        return this.resolveFieldConflict({ ...conflict, resolution: 'automatic' });

      default:
        return conflict.sources[0].value;
    }
  }

  /**
   * Calculate overall metadata quality score
   */
  private calculateMetadataQuality(sources: MetadataSource[], conflicts: MetadataConflict[]): MetadataQuality {
    // Calculate completeness (how many fields are filled)
    const totalFields = 15; // Approximate number of metadata fields
    const filledFields = sources.reduce((count, source) => count + source.fields.length, 0);
    const completeness = Math.min(filledFields / totalFields, 1.0);

    // Calculate accuracy based on source confidence
    const avgConfidence = sources.reduce((sum, source) => sum + source.confidence, 0) / sources.length;
    const accuracy = avgConfidence;

    // Calculate consistency (lower conflict count = higher consistency)
    const consistency = Math.max(0, 1 - (conflicts.length * 0.1));

    // Calculate freshness (all sources are fresh since just retrieved)
    const freshness = 1.0;

    // Overall quality is weighted average
    const overall = (completeness * 0.3) + (accuracy * 0.3) + (consistency * 0.25) + (freshness * 0.15);

    return {
      overall,
      completeness,
      accuracy,
      consistency,
      freshness,
      sources,
      conflictCount: conflicts.length,
      verificationStatus: overall > 0.8 ? 'verified' : overall > 0.6 ? 'unverified' : 'disputed'
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
    if (spotifyTrack?.album.images?.length) {
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
   * Batch match multiple tracks with enhanced metadata processing
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

  /**
   * Enhanced batch metadata enrichment
   */
  async batchEnrichMetadata(
    trackIds: Array<{ platform: 'spotify' | 'apple-music'; id: string }>,
    options?: {
      includeAudioFeatures?: boolean;
      includeRecommendations?: boolean;
      forceRefresh?: boolean;
    }
  ): Promise<UnifiedMusicMetadata[]> {
    const results: UnifiedMusicMetadata[] = [];
    const batchSize = 10; // Larger batch for metadata enrichment

    for (let i = 0; i < trackIds.length; i += batchSize) {
      const batch = trackIds.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (trackId) => {
        try {
          // Check cache first unless force refresh
          if (!options?.forceRefresh) {
            const cacheKey = `${trackId.platform}:${trackId.id}`;
            const cached = this.getCachedMetadata(cacheKey);
            if (cached) {
              return cached;
            }
          }

          // Fetch from platform APIs
          if (trackId.platform === 'spotify') {
            const spotifyTrack = await this.fetchSpotifyTrack(trackId.id);
            return await this.createUnifiedMetadata(spotifyTrack, undefined);
          } else {
            const appleMusicTrack = await this.fetchAppleMusicTrack(trackId.id);
            return await this.createUnifiedMetadata(undefined, appleMusicTrack);
          }
        } catch (error) {
          console.error(`Failed to enrich metadata for ${trackId.platform}:${trackId.id}:`, error);
          return null;
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          results.push(result.value);
        }
      });

      // Rate limiting delay
      if (i + batchSize < trackIds.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    entries: Array<{ key: string; accessCount: number; age: number }>;
    hitRate: number;
  } {
    const entries = Array.from(this.metadataCache.entries()).map(([key, entry]) => ({
      key,
      accessCount: entry.accessCount,
      age: Date.now() - entry.cachedAt,
    }));

    // Calculate hit rate (simplified - would need proper tracking in production)
    const hitRate = 0.85; // Placeholder

    return {
      size: this.metadataCache.size,
      entries,
      hitRate,
    };
  }

  /**
   * Clear metadata cache
   */
  clearCache(): void {
    this.metadataCache.clear();
  }

  /**
   * Configure metadata enrichment settings
   */
  configure(config: Partial<MetadataEnrichmentConfig>): void {
    this.enrichmentConfig = { ...this.enrichmentConfig, ...config };
  }

  // Helper methods for fetching individual tracks (to be implemented with actual API calls)
  private async fetchSpotifyTrack(_id: string): Promise<SpotifyTrack> {
    // This would use the actual Spotify service
    throw new Error('Not implemented - would use spotifyService.getTrack()');
  }

  private async fetchAppleMusicTrack(_id: string): Promise<AppleMusicTrack> {
    // This would use the actual Apple Music service
    throw new Error('Not implemented - would use appleMusicService.getTrack()');
  }
}

export const crossPlatformMusicService = new CrossPlatformMusicService();