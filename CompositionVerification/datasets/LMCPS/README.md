# LMCPS System - Liquid Mixer Control & Protection System

This directory contains the LMCPS (Liquid Mixer Control & Protection System) requirements.

## Format

- `LM_requirements.json` - Complete system with multiple components

This file contains requirements for multiple components:
- **FSM_Autopilot** - Autopilot finite state machine
- **FSM_Sensor** - Sensor finite state machine  
- **Euler** - Euler integration component

## Components

List all components:
```bash
node run.js list --dataset datasets/LMCPS/LM_requirements.json
```

## Usage

Analyze a specific component:
```bash
node run.js ours --dataset datasets/LMCPS/LM_requirements.json --component FSM_Autopilot
```

Compare all components:
```bash
node run.js compare --dataset datasets/LMCPS/LM_requirements.json
```

## Note

This dataset is already in FRET JSON format (with semantics). 
The original FRETish requirements are embedded in the `fulltext` field of each requirement.
