/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // Configura este valor con el nombre de tu repositorio para GitHub Pages
  basePath: process.env.NODE_ENV === 'production' ? '/insert-coin' : '',
  images: {
    unoptimized: true, // Necesario para exportación estática
  },
};

module.exports = nextConfig; 