/**
 * Vitest setup: replace happy-dom's stubby IndexedDB with fake-indexeddb's
 * complete implementation so our IndexedDB-backed code (useHistory) can run
 * end-to-end in the test environment.
 *
 * happy-dom 16 ships an extremely partial IndexedDB; doing this once at
 * setup is simpler than swapping it inside each test.
 */
import 'fake-indexeddb/auto'
