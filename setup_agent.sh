#!/bin/bash

AGENT_DIR=".agent"
SKILLS_DIR="$AGENT_DIR/skills"

# Create .agent folder if it doesn't exist
if [ ! -d "$AGENT_DIR" ]; then
  echo "Creating $AGENT_DIR directory..."
  mkdir "$AGENT_DIR"
else
  echo "$AGENT_DIR directory already exists."
fi

# Create skills folder if it doesn't exist
if [ ! -d "$SKILLS_DIR" ]; then
  echo "Creating $SKILLS_DIR directory..."
  mkdir "$SKILLS_DIR"
else
  echo "$SKILLS_DIR directory already exists."
fi

cd "$SKILLS_DIR"

# Clone the repos (skip if already cloned)
if [ ! -d "sui-on-chain-game-builder-skills" ]; then
  echo "Cloning sui-on-chain-game-builder-skills..."
  git clone https://github.com/Prajeet-Shrestha/sui-on-chain-game-builder-skills.git
else
  echo "sui-on-chain-game-builder-skills already exists, skipping."
fi

if [ ! -d "sui-move-skills" ]; then
  echo "Cloning sui-move-skills..."
  git clone https://github.com/Prajeet-Shrestha/sui-move-skills.git
else
  echo "sui-move-skills already exists, skipping."
fi

if [ ! -d "sui-on-chain-game-frontend-builder" ]; then
  echo "Cloning sui-on-chain-game-frontend-builder..."
  git clone https://github.com/Prajeet-Shrestha/sui-on-chain-game-frontend-builder.git
else
  echo "sui-on-chain-game-frontend-builder already exists, skipping."
fi

# Go back to project root for npx commands
cd ../..

if [ ! -d "$SKILLS_DIR/phaser-gamedev" ]; then
  echo "Adding phaser-gamedev skill..."
  npx skills add https://github.com/chongdashu/phaserjs-tinyswords --skill phaser-gamedev
else
  echo "phaser-gamedev already exists, skipping."
fi

if [ ! -d "$SKILLS_DIR/game-design-theory" ]; then
  echo "Adding game-design-theory skill..."
  npx skills add https://github.com/pluginagentmarketplace/custom-plugin-game-developer --skill game-design-theory
else
  echo "game-design-theory already exists, skipping."
fi

echo "Done!"
