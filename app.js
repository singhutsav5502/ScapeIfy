// Import necessary modules from Three.js
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// Create the scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

// Set the size of the renderer and append it to the DOM
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('canvas-container').appendChild(renderer.domElement);

// Add a grid helper to the scene
const gridHelper = new THREE.GridHelper(100, 100);
scene.add(gridHelper);

// Create a denser plane geometry using PlaneGeometry
const planeGeometry = new THREE.PlaneGeometry(100, 100, 199, 199);
const planeMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, wireframe: true });
const planeMesh = new THREE.Mesh(planeGeometry, planeMaterial);
planeMesh.rotation.x = -Math.PI / 2; // Rotate the plane to make it horizontal
scene.add(planeMesh);

// Set the camera position and orientation
camera.position.set(0, 50, 100);
camera.lookAt(0, 0, 0);

// Add a directional light to the scene
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(50, 50, 50).normalize();
scene.add(light);

// Initialize OrbitControls for camera movement
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // Damping for smooth control
controls.dampingFactor = 0.05;
controls.screenSpacePanning = false;
controls.maxPolarAngle = Math.PI / 2;

// Set controls to enabled by default for Navigation Mode
controls.enabled = true;

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    if (controls.enabled) {
        controls.update(); // Update controls for damping
    }
    renderer.render(scene, camera);
}
animate();

// Handle window resizing
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Initialize raycaster and mouse vector
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Function to modify terrain based on mouse interaction
function modifyTerrain(intersect, isRaising) {
    const geometry = intersect.object.geometry;
    const positions = geometry.attributes.position.array;

    // Get the clicked point in world coordinates
    const clickedPoint = intersect.point;

    // Iterate through all vertices of the plane
    for (let i = 0; i < positions.length; i += 3) {
        const vertexPosition = new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2]);

        // Convert the vertex position to world coordinates
        vertexPosition.applyMatrix4(intersect.object.matrixWorld);

        // Calculate the distance from the clicked point to the current vertex
        const distance = clickedPoint.distanceTo(vertexPosition);

        // Calculate falloff based on steps
        if (distance <= radius) {
            const normalizedDistance = distance / radius; // Distance normalized to [0, 1]
            const stepIndex = Math.floor((1 - normalizedDistance) / stepSize); // Determine step index
            const heightChange = maxFalloff - stepIndex * stepSize; // Amount to change based on step index

            // Adjust vertex height
            positions[i + 2] += isRaising ? heightChange : -heightChange;
        }
    }

    // Notify Three.js that the position attribute has changed
    geometry.attributes.position.needsUpdate = true;

    // Update the mesh color based on height
    updateMeshColor(geometry);
}

// Function to update the mesh color based on height
function updateMeshColor(geometry) {
    const positions = geometry.attributes.position.array;
    const colors = new Float32Array(positions.length);

    for (let i = 0; i < positions.length; i += 3) {
        const height = positions[i + 2];
        const color = new THREE.Color().setHSL((height + 10) / 20, 1, 0.5);
        colors[i] = color.r;
        colors[i + 1] = color.g;
        colors[i + 2] = color.b;
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.attributes.color.needsUpdate = true;
}

// Mouse down event to start painting or lowering
function onMouseDown(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObject(planeMesh);
    if (intersects.length > 0) {
        const isRaising = event.button === 0; // Left click (0) for raising, right click (2) for lowering
        modifyTerrain(intersects[0], isRaising);
        window.addEventListener('mousemove', onMouseDrag);
    }
}

// Mouse up event to stop painting or lowering
function onMouseUp(event) {
    window.removeEventListener('mousemove', onMouseDrag);
}

// Mouse drag event to modify terrain
function onMouseDrag(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObject(planeMesh);
    if (intersects.length > 0) {
        const isRaising = event.buttons === 1; // Left click (1) for raising, right click (2) for lowering
        modifyTerrain(intersects[0], isRaising);
    }
}

// UI Button Functionality
const navigationButton = document.getElementById('navigation-mode');
const paintingButton = document.getElementById('painting-mode');

// Define step sizes
let maxFalloff = 0.5;
let stepSize = 5;

// Handle brush size slider
const radiusSlider = document.getElementById('brush-size');
const radiusValue = document.getElementById('brush-size-value');
let radius = radiusSlider.value;

radiusSlider.addEventListener('input', (e) => {
    radius = e.target.value;
    radiusValue.textContent = radius;
});

// Handle maxFalloff slider
const maxFalloffSlider = document.getElementById('max-falloff');
const maxFalloffValue = document.getElementById('max-falloff-value');

maxFalloffSlider.addEventListener('input', (e) => {
    maxFalloff = e.target.value;
    maxFalloffValue.textContent = maxFalloff;
});

// Handle stepSize slider
const stepSizeSlider = document.getElementById('step-size');
const stepSizeValue = document.getElementById('step-size-value');

stepSizeSlider.addEventListener('input', (e) => {
    stepSize = e.target.value;
    stepSizeValue.textContent = stepSize;
});

// Update brush size on slider input
radiusSlider.addEventListener('input', (e) => {
    radius = e.target.value;
})

navigationButton.addEventListener('click', () => {
    controls.enabled = true; // Enable OrbitControls
    radiusSlider.disabled = true; // Disable brush size control
    window.removeEventListener('mousedown', onMouseDown);
    window.removeEventListener('mouseup', onMouseUp);
    window.removeEventListener('mousemove', onMouseDrag);
});

paintingButton.addEventListener('click', () => {
    controls.enabled = false; // Disable OrbitControls
    radiusSlider.disabled = false; // Enable brush size control
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
});
document.addEventListener('contextmenu', (event) => {
    event.preventDefault();
}, false);