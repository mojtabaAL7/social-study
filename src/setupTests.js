import '@testing-library/jest-dom';
import { TextDecoder, TextEncoder } from 'util';

// React Router v7 expects these globals, which CRA's jsdom version does not provide.
Object.assign(global, { TextEncoder, TextDecoder });
