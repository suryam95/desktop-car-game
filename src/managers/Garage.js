const Car = require('../entities/Car');

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

        // 2. Drift King (Slippery, Purple Smoke)
        const car2 = new Car(100, 200, {
            bodyColor: '#9B59B6', // Purple
            maxSpeed: 7,
            acceleration: 0.4,
            friction: 0.98, // Very slippery
            rotationSpeed: 0.07,
            driftThreshold: 0.1, // Drifts easily
            smokeColor: '#8E44AD',
            driftColor: '#E056FD'
        });

        // 3. The Tank (Slow, Heavy, Wide Tires)
        const car3 = new Car(100, 300, {
            bodyColor: '#2C3E50', // Dark Blue/Grey
            maxSpeed: 4,
            acceleration: 0.2,
            friction: 0.9, // Stops fast
            rotationSpeed: 0.03,
            tireWidth: 12,
            wheelColor: '#000000'
        });

        // 4. Neon Speedster (Fast, Sticky)
        const car4 = new Car(100, 400, {
            bodyColor: '#2ECC71', // Neon Green
            maxSpeed: 9,
            acceleration: 0.6,
            friction: 0.94,
            rotationSpeed: 0.06,
            driftThreshold: 0.4, // Hard to drift
            driftColor: '#00FF00' // Neon trails
        });

        this.vehicles = [car1, car2, car3, car4];

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
        this.parkingSpots[0].occupiedBy = null; // Spot 0 is now empty (active car left it)
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

            if (dist < 60) { // Increased from 30
                // We are at a spot.
                if (spot.occupiedBy !== null) {
                    // Return candidate for UI
                    const canSwitch = Math.abs(activeCar.speed) < 2.0;
                    const gPressed = input.keys['g'] || input.keys['G'];
                    if (canSwitch && gPressed && !input.gKeyLocked) {
                        this.switchVehicle(spot.occupiedBy);
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

    switchVehicle(targetIndex) {
        if (targetIndex === this.currentIndex) return;

        // Current car "parks" in the spot of the target car? 
        // No, that teleports. 
        // Cars should have persistent locations.
        // We are at the location of the target car (within 30px).
        // So we swap control.

        const prevIndex = this.currentIndex;
        this.currentIndex = targetIndex;

        // The car we just left is now "parked" at its current location
        // Which should be near the spot we just drove to.
        // We need to update the logic of spots? 
        // Actually, the "spots" are just designated coordinates.
        // If I drive Car A to Car B's spot, and switch...
        // Car A is now at Car B's spot. Car B becomes active.

        // Let's simplify: 
        // The spot we drove to (where targetIndex car is) became OUR location.
        // So we just take control of targetIndex car.
        // Car A is left there. 

        // Update parking spot logic:
        // Find which spot is closest to the Old Car (Car A) and mark it occupied by Old Car
        // Mark the spot of New Car (Car B) as empty (since it's leaving).

        // This assumes cars are always at spots. If we park efficiently.
        // Let's just swap the "occupiedBy" pointer for the spot.

        // Find spot occupied by targetIndex
        const spotIndex = this.parkingSpots.findIndex(s => s.occupiedBy === targetIndex);
        if (spotIndex !== -1) {
            this.parkingSpots[spotIndex].occupiedBy = prevIndex; // Swap! previous car is now in this spot
        }

        // Visual feedback? 
        // The cars are physically there. We just change camera focus / control.
    }
    getAllVehicles() {
        return this.vehicles;
    }
}

module.exports = Garage;
