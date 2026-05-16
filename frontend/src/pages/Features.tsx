import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Navbar } from '@/components/Navbar';

const features = [
  {
    title: 'Massive Anime Library',
    description: 'Explore thousands of anime titles, from the most popular series to hidden gems. Our library is constantly updated.',
    image: 'https://cdn.wallpapersafari.com/44/10/z83XfV.jpg',
  },
  {
    title: 'Watch Together',
    description: 'Create or join rooms to watch anime with your friends in real-time, with synchronized playback.',
    image: 'https://wallpapercave.com/wp/wp8334396.jpg',
  },
  {
    title: 'Track Your Progress',
    description: 'Keep track of the anime you are watching, and get recommendations based on your viewing history.',
    image: 'https://wallpapercave.com/wp/wp6848266.jpg',
  },
  {
    title: 'No Ads, Just Anime',
    description: 'Enjoy an uninterrupted, ad-free viewing experience. Focus on what matters most: the anime.',
    image: 'https://wallpapercave.com/wp/wp10752191.jpg',
  },
];

const Features = () => {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <Navbar />
      <div className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-6xl font-bold mb-4">Welcome to Anime Stream Hub</h1>
          <p className="text-lg md:text-xl text-muted-foreground">
            Your ultimate destination for anime streaming.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: index * 0.2 }}
              className="rounded-lg overflow-hidden shadow-lg bg-card"
            >
              <img src={feature.image} alt={feature.title} className="w-full h-64 object-cover" />
              <div className="p-6">
                <h3 className="text-2xl font-bold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: features.length * 0.2 }}
          className="text-center mt-12"
        >
          <Button asChild size="lg">
            <Link to="/home">Enter the Hub</Link>
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default Features;
