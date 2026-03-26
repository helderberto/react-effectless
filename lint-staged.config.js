export default {
  '*.{ts,tsx}': (files) => [
    `npm run format:files -- ${files.join(' ')}`,
    `npm run lint:files -- ${files.join(' ')}`,
  ],
  '*.{json,md}': (files) => [`npm run format:files -- ${files.join(' ')}`],
}
