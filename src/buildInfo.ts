// Which build this is (#38). The build workflow overwrites BUILD_SHA with the short git commit before building,
// so two APKs with the same version can be told apart in the app bar. Local and test builds show "dev".
export const BUILD_SHA: string = 'dev';
