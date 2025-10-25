// Temporary ambient declarations to allow TS compile before installing @types/* packages.
// These should be removed once `npm install` is executed and proper type packages are present.
declare var process: any;

declare module 'express';
declare module 'cors';
declare module 'cookie-parser';
declare module 'socket.io';
declare module 'http';
