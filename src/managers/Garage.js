const Car = require('../entities/Car');
const Plane = require('../entities/Plane');

class Garage {
    constructor() {
        this.vehicles = [];
        this.currentIndex = 0;

        this.initVehicles();
    }

    initVehicles() {
        // Defines spots in top left (parking lot)
        // Let's say we have 4 vertical spots
        this.parkingSpots = [
            { x: 100, y: 100, occupiedBy: null },
            { x: 100, y: 200, occupiedBy: null },
            { x: 100, y: 300, occupiedBy: null },
            { x: 100, y: 400, occupiedBy: null }
        ];

        // 1. Red Racer (Standard)
        const car1 = new Car(100, 100, {
            bodyColor: '#FF5A5F',
            maxSpeed: 6
        });

        // 2. The Plane (White)
        const plane = new Plane(100, 200, {
            bodyColor: '#FFFFFF',
            wingColor: '#DDDDDD',
            maxSpeed: 10
        });

        // 3. Neon Speedster (Green)
        const car4 = new Car(100, 300, {
            bodyColor: '#2ECC71', // Neon Green
            maxSpeed: 9,
            acceleration: 0.6,
            friction: 0.94,
            rotationSpeed: 0.06,
            driftThreshold: 0.4, // Hard to drift
            driftColor: '#00FF00' // Neon trails
        });

        // (Removed Tank and Drift King as requested)

        this.vehicles = [car1, plane, car4];

        // Assign cars to spots initially
        this.vehicles.forEach((v, i) => {
            if (this.parkingSpots[i]) {
                v.x = this.parkingSpots[i].x;
                v.y = this.parkingSpots[i].y;
                v.angle = 0; // Parked facing right
                this.parkingSpots[i].occupiedBy = i;
            }
        });

        // Start with first car active
        this.currentIndex = 0;
        this.parkingSpots[0].occupiedBy = null; // Spot 0 is now empty
    }

    getCurrentVehicle() {
        return this.vehicles[this.currentIndex];
    }

    // Check if we can park or switch
    checkParking(input, gameTime) {
        // If we drive into an empty spot -> Park? 
        // Or if we drive near another car -> Switch?
        // User wants: "garage options where I can drive and park my car and take any other car"

        const activeCar = this.getCurrentVehicle();

        // Check overlap with spots
        for (let i = 0; i < this.parkingSpots.length; i++) {
            const spot = this.parkingSpots[i];
            const dx = activeCar.x - spot.x;
            const dy = activeCar.y - spot.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Increased radius (approx 80px visual box, check < 80)
            if (dist < 80) {
                // We are at a spot.
                if (spot.occupiedBy !== null) {
                    // Return candidate for UI
                    const canSwitch = Math.abs(activeCar.speed) < 2.0;
                    const gPressed = input.keys['g'] || input.keys['G'];

                    if (canSwitch && gPressed && !input.gKeyLocked) {
                        this.switchVehicle(spot.occupiedBy, spot); // Pass spot for snapping
                        input.gKeyLocked = true;
                        setTimeout(() => input.gKeyLocked = false, 500);
                        return { switched: true };
                    }
                    return { canSwitch: canSwitch, targetIndex: spot.occupiedBy };
                }
            }
        }
        return null;
    }

    switchVehicle(targetIndex, spot) {
        if (targetIndex === this.currentIndex) return;

        const prevIndex = this.currentIndex;
        const oldVehicle = this.vehicles[prevIndex];

        // Swap control
        this.currentIndex = targetIndex;

        // LOGIC REFINEMENT:
        // The vehicle we just left (oldVehicle) should be parked in the spot we just took.
        // We know 'spot' is where the new vehicle was.
        // So snap oldVehicle to spot.x, spot.y for tidy parking.

        oldVehicle.x = spot.x;
        oldVehicle.y = spot.y;
        oldVehicle.angle = 0; // Ensure parked straight
        oldVehicle.speed = 0;
        oldVehicle.moveAngle = 0;

        // Visual "Occupied" Swap
        // Find which spot was occupied by targetIndex (should be 'spot')
        const spotIndex = this.parkingSpots.indexOf(spot);
        if (spotIndex !== -1) {
            this.parkingSpots[spotIndex].occupiedBy = prevIndex; // Swap! previous car is now in this spot
        }
    }

    getAllVehicles() {
        return this.vehicles;
    }
}

module.exports = Garage;
