// Firebase SDKs (Updated to v10.12.2 and ES Modules)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// *** IMPORTANT: Replace 'YOUR_Maps_API_KEY' with your actual API Key ***
// You'll need to enable "Maps JavaScript API" and "Geocoding API" in Google Cloud Console.
const Maps_API_KEY = 'YOUR_Maps_API_KEY'; // REPLACE THIS WITH YOUR ACTUAL GOOGLE MAPS API KEY

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCVmqNGkGLMVW01wjg9RPdzNdHSZCBc4Mc",
    authDomain: "petpaw-6e2f4.firebaseapp.com",
    databaseURL: "https://petpaw-6e2f4-default-rtdb.firebaseio.com",
    projectId: "petpaw-6e2f4",
    storageBucket: "petpaw-6e2f4.appspot.com",
    messagingSenderId: "491729743424",
    appId: "1:491729743424:web:6fcce379d3e948efbab9a5",
    measurementId: "G-BVZQF87FVP"
};

// Initialize Firebase services
const app = initializeApp(firebaseConfig);
const auth = getAuth(app); // Get Auth service
const db = getDatabase(app); // Get Realtime Database service
const storage = getStorage(app); // Uncommented for Firebase Storage

let map;
let marker;
let currentMapTarget = null; // To know if we are selecting 'pickup' or 'dropoff'

/**
 * Loads the Google Maps API script dynamically.
 * The `initMap` function will be called once the script is loaded.
 */
function loadGoogleMapsScript() {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${Maps_API_KEY}&callback=initMap`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
}

/**
 * Initializes the Google Map. This function is called by the Google Maps API
 * once the script is loaded and parsed.
 */
window.initMap = function() { // Make globally accessible for Google Maps callback
    const phitsanulokCenter = { lat: 16.8248, lng: 100.2796 }; // Default center for Phitsanulok

    map = new google.maps.Map(document.getElementById('map'), {
        center: phitsanulokCenter,
        zoom: 15,
        fullscreenControl: false,
        streetViewControl: false,
        mapTypeControl: false,
        zoomControl: true,
        // mapId: 'YOUR_MAP_ID' // Optional: If you have a custom map style ID from Google Cloud Console
    });

    marker = new google.maps.Marker({
        map: map,
        position: phitsanulokCenter,
        draggable: true, // Allow user to drag the marker
        title: 'ลากเพื่อปักหมุด',
        animation: google.maps.Animation.DROP,
    });

    // Update marker position on map click
    map.addListener('click', (e) => {
        marker.setPosition(e.latLng);
    });

    // Reverse geocode on marker drag end to get address
    const geocoder = new google.maps.Geocoder();
    marker.addListener('dragend', () => {
        const latlng = marker.getPosition();
        geocoder.geocode({ 'location': latlng }, (results, status) => {
            if (status === 'OK' && results[0]) {
                console.log('Selected Address:', results[0].formatted_address);
                // Optionally update a temporary display in the modal with the address
            } else {
                console.error('Geocoder failed due to: ' + status);
            }
        });
    });
};

/**
 * Displays a custom message box (modal).
 * @param {string} title - The title of the message box.
 * @param {string} message - The message to display.
 */
export function showMessageBox(title, message) {
    document.getElementById('messageBoxTitle').innerText = title;
    document.getElementById('messageBoxText').innerText = message;
    document.getElementById('messageBoxOverlay').classList.add('show');
}

/**
 * Hides the custom message box.
 */
export function hideMessageBox() {
    document.getElementById('messageBoxOverlay').classList.remove('show');
}

/**
 * Shows a specific content section and updates navigation active state.
 * @param {string} sectionId - The ID of the section to show (e.g., 'homeSection').
 */
export function showSection(sectionId) {
    // Hide all content sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });

    // Deactivate all navigation buttons
    document.querySelectorAll('.nav-button').forEach(button => {
        button.classList.remove('active');
    });

    // Show the target section
    document.getElementById(sectionId).classList.add('active');

    // Activate the corresponding navigation button
    const navButtonId = `nav${sectionId.replace('Section', '')}`;
    const navButton = document.getElementById(navButtonId);
    if (navButton) {
        navButton.classList.add('active');
    }

    // Update header title
    const headerTitle = document.getElementById('appHeader');
    switch (sectionId) {
        case 'homeSection':
            headerTitle.textContent = 'หน้าหลัก';
            break;
        case 'promotionsSection':
            headerTitle.textContent = 'โปรโมชั่น';
            break;
        case 'pricesSection':
            headerTitle.textContent = 'ราคาบริการ';
            break;
        case 'bookSection':
            headerTitle.textContent = 'จองบริการ';
            break;
        case 'findingDriverSection':
            headerTitle.textContent = 'กำลังค้นหาคนขับ';
            break;
        case 'liveTrackingSection':
            headerTitle.textContent = 'ติดตามการเดินทาง';
            break;
        case 'loginSection':
            headerTitle.textContent = 'เข้าสู่ระบบ';
            break;
        case 'accountSection':
            headerTitle.textContent = 'บัญชีของฉัน';
            // Load user profile data when navigating to account section
            loadUserProfile();
            break;
        default:
            headerTitle.textContent = 'PetPorter';
    }
}

/**
 * Opens the map modal for selecting pickup or dropoff location.
 * @param {string} target - 'pickup' or 'dropoff'.
 */
export function openMapModal(target) {
    currentMapTarget = target;
    const modal = document.getElementById('mapModal');
    const title = document.getElementById('mapModalTitle');

    if (target === 'pickup') {
        title.textContent = 'เลือกจุดรับ';
    } else {
        title.textContent = 'เลือกจุดส่ง';
    }

    modal.style.display = 'flex'; // Show the modal

    // Ensure map is rendered correctly after modal is displayed
    if (map) {
        google.maps.event.trigger(map, 'resize');
        const initialLat = document.getElementById(`${target}LocationLat`).value;
        const initialLng = document.getElementById(`${target}LocationLng`).value;

        if (initialLat && initialLng) {
            // If coordinates already exist, center map and set marker to them
            const latLng = new google.maps.LatLng(parseFloat(initialLat), parseFloat(initialLng));
            map.setCenter(latLng);
            marker.setPosition(latLng);
        } else {
            // Otherwise, try to get current location or default to Phitsanulok
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const userLatLng = {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                        };
                        map.setCenter(userLatLng);
                        marker.setPosition(userLatLng);
                    },
                    () => {
                        // Fallback to marker's current position if geolocation fails
                        map.setCenter(marker.getPosition());
                    }
                );
            } else {
                // Browser doesn't support Geolocation, fall back to marker's current position
                map.setCenter(marker.getPosition());
            }
        }
    }
}

/**
 * Closes the map modal.
 */
export function closeMapModal() {
    document.getElementById('mapModal').style.display = 'none';
    currentMapTarget = null;
}

/**
 * Selects the location from the map (where the marker is) and updates the form fields.
 */
export function selectLocationFromMap() {
    if (!marker || !currentMapTarget) {
        console.error("No marker or target defined.");
        return;
    }

    const latLng = marker.getPosition();
    const lat = latLng.lat();
    const lng = latLng.lng();

    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ 'location': latLng }, (results, status) => {
        if (status === 'OK' && results[0]) {
            const address = results[0].formatted_address;
            document.getElementById(`${currentMapTarget}LocationDisplay`).textContent = address;
            document.getElementById(`${currentMapTarget}LocationLat`).value = lat;
            document.getElementById(`${currentMapTarget}LocationLng`).value = lng;
            closeMapModal(); // Close the modal after selection
        } else {
            showMessageBox("ข้อผิดพลาด", "ไม่สามารถหาที่อยู่จากตำแหน่งที่เลือกได้: " + status);
            console.error('Geocoder failed due to: ' + status);
        }
    });
}

/**
 * Handles user login with email and password.
 */
export function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!email || !password) {
        showMessageBox("ข้อมูลไม่ครบถ้วน", "โปรดกรอกอีเมลและรหัสผ่านให้ครบถ้วน");
        return;
    }

    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            showMessageBox("เข้าสู่ระบบสำเร็จ!", "ยินดีต้อนรับ " + user.email);
            console.log("User logged in:", user);
            // UI will be updated by onAuthStateChanged listener
            showSection('homeSection'); // Automatically go to home after login
        })
        .catch((error) => {
            let errorMessage = "เข้าสู่ระบบไม่สำเร็จ: " + error.message;
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                errorMessage = "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = "รูปแบบอีเมลไม่ถูกต้อง";
            }
            showMessageBox("เข้าสู่ระบบไม่สำเร็จ", errorMessage);
            console.error("Login error:", error);
        });
}

/**
 * Handles user registration with email and password.
 */
export function register() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!email || !password) {
        showMessageBox("ข้อมูลไม่ครบถ้วน", "โปรดกรอกอีเมลและรหัสผ่านให้ครบถ้วน");
        return;
    }

    if (password.length < 6) {
        showMessageBox("รหัสผ่านไม่ปลอดภัย", "รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
        return;
    }

    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            // Save user data to Realtime Database
            set(ref(db, 'users/' + user.uid), {
                email: user.email,
                uid: user.uid,
                createdAt: new Date().toISOString()
            }).then(() => {
                showMessageBox("สมัครสมาชิกสำเร็จ!", "ยินดีต้อนรับ " + user.email + " คุณสามารถเข้าสู่ระบบได้แล้ว");
                console.log("User data saved to RTDB.");
                // Clear form after successful registration
                document.getElementById('email').value = "";
                document.getElementById('password').value = "";
            }).catch((dbError) => {
                console.error("Error writing user to RTDB:", dbError);
                showMessageBox("สมัครสมาชิกสำเร็จ", "แต่บันทึกข้อมูลผู้ใช้ไม่สมบูรณ์: " + dbError.message);
            });
        })
        .catch((error) => {
            let errorMessage = "สมัครไม่สำเร็จ: " + error.message;
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = "อีเมลนี้ถูกใช้ไปแล้ว โปรดใช้อีเมลอื่น";
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = "รูปแบบอีเมลไม่ถูกต้อง";
            } else if (error.code === 'auth/weak-password') {
                errorMessage = "รหัสผ่านอ่อนเกินไป โปรดตั้งรหัสผ่านที่แข็งแรงกว่านี้";
            }
            showMessageBox("สมัครไม่สำเร็จ", errorMessage);
            console.error("Registration error:", error);
        });
}

/**
 * Handles user logout.
 */
export function logout() {
    signOut(auth).then(() => {
        showMessageBox("ออกจากระบบสำเร็จ", "คุณได้ออกจากระบบแล้ว");
        console.log("User signed out.");
        showSection('homeSection'); // Redirect to home after logout
    }).catch((error) => {
        showMessageBox("เกิดข้อผิดพลาด", "ไม่สามารถออกจากระบบได้: " + error.message);
        console.error("Logout error:", error);
    });
}

/**
 * Handles the booking confirmation.
 * Saves booking data to Firebase.
 */
export function confirmBooking() {
    const petName = document.getElementById('petNameInput').value.trim();
    const petSpecies = document.getElementById('petSpeciesInput').value.trim();
    const numPets = document.getElementById('numPets').value;
    const pickupDisplay = document.getElementById('pickupLocationDisplay').textContent;
    const pickupLat = document.getElementById('pickupLocationLat').value;
    const pickupLng = document.getElementById('pickupLocationLng').value;
    const dropoffDisplay = document.getElementById('dropoffLocationDisplay').textContent;
    const dropoffLat = document.getElementById('dropoffLocationLat').value;
    const dropoffLng = document.getElementById('dropoffLocationLng').value;

    // Basic validation
    if (!petName || !petSpecies || !numPets || !pickupLat || !dropoffLat || pickupDisplay === "คลิกเพื่อเลือกจุดรับบนแผนที่" || dropoffDisplay === "คลิกเพื่อเลือกจุดส่งบนแผนที่") {
        showMessageBox("ข้อมูลไม่ครบถ้วน", "กรุณากรอกข้อมูลสัตว์เลี้ยง, จำนวน, และเลือกตำแหน่งบนแผนที่ให้ครบถ้วน");
        return;
    }

    // Prepare booking data
    const bookingData = {
        petName: petName,
        petType: petSpecies, // Using species as type for simplicity
        numPets: parseInt(numPets),
        pickup: {
            address: pickupDisplay,
            lat: parseFloat(pickupLat),
            lng: parseFloat(pickupLng)
        },
        dropoff: {
            address: dropoffDisplay,
            lat: parseFloat(dropoffLat),
            lng: parseFloat(dropoffLng)
        },
        status: "waiting", // Initial status
        timestamp: Date.now(),
        ownerUid: auth.currentUser ? auth.currentUser.uid : null // Associate with user if logged in
    };

    // Save to Firebase
    db.ref('orders').push(bookingData)
        .then(() => {
            showMessageBox("เรียบร้อย!", "✅ เรียกรถเรียบร้อยแล้ว! กรุณารอคนขับรับงาน");
            // Clear form fields
            document.getElementById('petNameInput').value = "";
            document.getElementById('petSpeciesInput').value = "";
            document.getElementById('numPets').value = "1";
            document.getElementById('pickupLocationDisplay').textContent = "คลิกเพื่อเลือกจุดรับบนแผนที่";
            document.getElementById('pickupLocationLat').value = "";
            document.getElementById('pickupLocationLng').value = "";
            document.getElementById('dropoffLocationDisplay').textContent = "คลิกเพื่อเลือกจุดส่งบนแผนที่";
            document.getElementById('dropoffLocationLat').value = "";
            document.getElementById('dropoffLocationLng').value = "";

            showSection('findingDriverSection'); // Transition to finding driver screen
        })
        .catch(error => {
            showMessageBox("เกิดข้อผิดพลาด", "❌ เกิดข้อผิดพลาดในการจอง: " + error.message);
            console.error("Error saving booking:", error);
        });
}

/**
 * Handles cancellation of a booking (simulated).
 */
export function cancelBooking() {
    showMessageBox("ยกเลิกการจอง", "คุณได้ยกเลิกการจองแล้ว");
    showSection('homeSection'); // Go back to home
}

/**
 * Loads recent trips from Firebase and displays them in the home section.
 * This function currently loads all orders, consider filtering by user if needed.
 */
export function loadRecentTrips() {
    // This function is no longer directly used by the home section,
    // but kept for potential future use or other sections.
    const recentTripsList = document.getElementById('recentTripsList');
    if (recentTripsList) { // Check if element exists before manipulating
        recentTripsList.innerHTML = '<li class="flex items-center justify-center p-3 text-gray-500">กำลังโหลดการเดินทางล่าสุด...</li>';

        // For now, this loads all orders. If you want to show only logged-in user's orders,
        // you'll need to add a 'ownerUid' field to 'orders' and filter here.
        onValue(ref(db, 'orders'), snapshot => { // Removed limitToLast(3) as it's not displayed
            const orders = snapshot.val();
            recentTripsList.innerHTML = ''; // Clear previous content

            if (!orders) {
                recentTripsList.innerHTML = '<li class="flex items-center justify-center p-3 text-gray-500">ยังไม่มีการเดินทางล่าสุด</li>';
                return;
            }

            // Convert object to array and reverse to get most recent first
            const sortedOrders = Object.keys(orders).map(key => ({ id: key, ...orders[key] })).reverse();

            sortedOrders.forEach(order => {
                const listItem = document.createElement('li');
                listItem.className = 'flex items-center justify-between p-3 bg-gray-50 rounded-lg shadow-sm recent-trip-item';
                listItem.onclick = () => showTripDetails(order.id); // Pass trip ID to details function

                const petIcon = (order.petType && order.petType.includes('สุนัข')) ? '🐶' :
                               (order.petType && order.petType.includes('แมว')) ? '🐱' :
                               (order.petType && order.petType.includes('นก')) ? '🦜' : '🐾'; // Generic paw print

                listItem.innerHTML = `
                    <div class="flex items-center space-x-3">
                        <img src="https://placehold.co/40x40/fcd34d/000000?text=${petIcon}" alt="Pet Icon" class="rounded-full">
                        <div>
                            <p class="font-medium text-gray-700">${order.petName} ไป ${order.dropoff.address}</p>
                            <p class="text-sm text-gray-500">${new Date(order.timestamp).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}</p>
                        </div>
                    </div>
                    <i data-lucide="chevron-right" class="w-5 h-5 text-gray-400"></i>
                `;
                recentTripsList.appendChild(listItem);
            });
            lucide.createIcons(); // Re-render Lucide icons for newly added elements
        });
    }
}

/**
 * Displays details of a specific trip (currently a placeholder).
 * @param {string} tripId - The ID of the trip to show details for.
 */
export function showTripDetails(tripId) {
    // In a real app, you would fetch details for this tripId from Firebase
    // and populate the liveTrackingSection with specific data.
    console.log(`Showing details for trip: ${tripId}`);
    document.getElementById('liveTrackingTitle').textContent = `ติดตามการเดินทาง #${tripId.substring(0, 5)}...`; // Example title update
    showSection('liveTrackingSection');
}

let isEditingProfile = false; // State to track if profile is in edit mode

/**
 * Toggles the profile section between display and edit mode.
 * @param {boolean} editMode - True to enter edit mode, false to exit.
 */
export function toggleProfileEditMode(editMode) {
    isEditingProfile = editMode;
    const profileDisplayElements = document.querySelectorAll('.profile-display');
    const profileEditElements = document.querySelectorAll('.profile-edit');
    const editProfileButton = document.getElementById('editProfileButton');
    const saveProfileButton = document.getElementById('saveProfileButton');
    const cancelEditButton = document.getElementById('cancelEditButton');
    const profilePictureInput = document.getElementById('profilePictureInput');
    const changePictureButton = document.getElementById('changePictureButton');

    if (editMode) {
        profileDisplayElements.forEach(el => el.classList.add('hidden'));
        profileEditElements.forEach(el => el.classList.remove('hidden'));
        if (editProfileButton) editProfileButton.classList.add('hidden');
        if (saveProfileButton) saveProfileButton.classList.remove('hidden');
        if (cancelEditButton) cancelEditButton.classList.remove('hidden');
        if (profilePictureInput) profilePictureInput.classList.remove('hidden');
        if (changePictureButton) changePictureButton.classList.remove('hidden');
    } else {
        profileDisplayElements.forEach(el => el.classList.remove('hidden'));
        profileEditElements.forEach(el => el.classList.add('hidden'));
        if (editProfileButton) editProfileButton.classList.remove('hidden');
        if (saveProfileButton) saveProfileButton.classList.add('hidden');
        if (cancelEditButton) cancelEditButton.classList.add('hidden');
        if (profilePictureInput) profilePictureInput.classList.add('hidden');
        if (changePictureButton) changePictureButton.classList.add('hidden');
        // No need to call loadUserProfile here, as onValue listener will handle updates
        // Or if you want to explicitly revert unsaved changes, you could call loadUserProfile()
        // but ensure it's not causing a loop or race condition.
    }
}

/**
 * Loads user profile data from Firebase Realtime Database.
 */
export function loadUserProfile() {
    const user = auth.currentUser;
    const accountInfoDiv = document.getElementById('accountInfo');

    if (!user) {
        // Not logged in, show login prompt
        accountInfoDiv.innerHTML = `
            <h3 class="text-lg font-semibold text-gray-700 mb-2">คุณยังไม่ได้เข้าสู่ระบบ</h3>
            <p class="text-gray-600 mb-4">โปรดเข้าสู่ระบบเพื่อจัดการข้อมูลบัญชีของคุณ</p>
            <button onclick="showSection('loginSection')" class="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-xl transition duration-300 ease-in-out shadow-md">
                ไปที่หน้าเข้าสู่ระบบ
            </button>
        `;
        return;
    }

    // Display loading state
    accountInfoDiv.innerHTML = `
        <div class="flex flex-col items-center mb-6">
            <div class="spinner mb-4"></div>
            <p class="text-gray-500">กำลังโหลดข้อมูลโปรไฟล์...</p>
        </div>
    `;

    // Fetch user profile data
    onValue(ref(db, 'users/' + user.uid + '/profile'), (snapshot) => {
        const profile = snapshot.val();
        const defaultProfilePic = "https://placehold.co/100x100/6a5acd/ffffff?text=👤"; // Default avatar

        // Update UI based on fetched data
        accountInfoDiv.innerHTML = `
            <div class="flex flex-col items-center mb-6">
                <div class="relative">
                    <img id="profilePicture" src="${profile?.photoURL || defaultProfilePic}" alt="Profile Picture" class="rounded-full border-4 border-purple-300 shadow-lg mb-4 w-28 h-28 object-cover">
                    <input type="file" id="profilePictureInput" class="hidden" accept="image/*" onchange="handleProfilePictureChange(event)">
                    <button id="changePictureButton" onclick="document.getElementById('profilePictureInput').click()" class="profile-edit hidden absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-md border border-gray-200 hover:bg-gray-100 transition">
                        <i data-lucide="camera" class="w-5 h-5 text-gray-700"></i>
                    </button>
                </div>
                <h3 class="text-xl font-bold text-gray-800 mb-1 profile-display">คุณ ${profile?.name || user.email.split('@')[0]}</h3>
                <input type="text" id="editName" class="form-input profile-edit hidden text-center text-xl font-bold mb-1" value="${profile?.name || ''}" placeholder="ชื่อ-นามสกุล">
                <p class="text-sm text-gray-500 profile-display">${user.email}</p>
            </div>
            <div class="space-y-4 mb-6">
                <div>
                    <p class="font-semibold text-gray-700">ชื่อ-นามสกุล:</p>
                    <p class="text-gray-600 profile-display">${profile?.name || 'ยังไม่มีข้อมูล'}</p>
                    <input type="text" id="editFullName" class="form-input profile-edit hidden" value="${profile?.name || ''}" placeholder="ชื่อ-นามสกุล">
                </div>
                <div>
                    <p class="font-semibold text-gray-700">เบอร์โทรศัพท์:</p>
                    <p class="text-gray-600 profile-display">${profile?.phone || 'ยังไม่มีข้อมูล'}</p>
                    <input type="tel" id="editPhone" class="form-input profile-edit hidden" value="${profile?.phone || ''}" placeholder="เบอร์โทรศัพท์">
                </div>
                <div>
                    <p class="font-semibold text-gray-700">ที่อยู่:</p>
                    <p class="text-gray-600 profile-display">${profile?.address || 'ยังไม่มีข้อมูล'}</p>
                    <textarea id="editAddress" class="form-input profile-edit hidden h-24" placeholder="ที่อยู่">${profile?.address || ''}</textarea>
                </div>
            </div>
            <div class="space-y-3">
                <button id="editProfileButton" onclick="toggleProfileEditMode(true)" class="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-xl transition duration-300 ease-in-out shadow-md">
                    แก้ไขโปรไฟล์
                </button>
                <button id="saveProfileButton" onclick="saveProfile()" class="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-xl transition duration-300 ease-in-out shadow-md hidden">
                    บันทึกการเปลี่ยนแปลง
                </button>
                <button id="cancelEditButton" onclick="toggleProfileEditMode(false)" class="w-full bg-gray-400 hover:bg-gray-500 text-white font-bold py-3 px-4 rounded-xl transition duration-300 ease-in-out shadow-md hidden">
                    ยกเลิก
                </button>
                <button onclick="contactAdmin()" class="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 px-4 rounded-xl transition duration-300 ease-in-out shadow-md">
                    ติดต่อแอดมิน
                </button>
                <button onclick="logout()" class="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-xl transition duration-300 ease-in-out shadow-md">
                    ออกจากระบบ
                </button>
            </div>
        `;
        lucide.createIcons(); // Re-render Lucide icons
        // Ensure edit mode is off by default when loading
        toggleProfileEditMode(false); // Set to display mode after content is loaded
    });
}

/**
 * Handles the change of profile picture input.
 * Displays a preview of the selected image and uploads it to Firebase Storage.
 * @param {Event} event - The change event from the file input.
 */
export function handleProfilePictureChange(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('profilePicture').src = e.target.result;
        };
        reader.readAsDataURL(file);

        const user = auth.currentUser;
        if (user && storage) {
            // Create a storage reference for the profile picture
            // Using a fixed file name like 'profile.jpg' to easily replace previous photos
            const imageRef = storageRef(storage, `profile_pictures/${user.uid}/profile.jpg`);
            
            // Display a temporary message while uploading
            showMessageBox("กำลังอัปโหลด", "กำลังอัปโหลดรูปโปรไฟล์...");

            uploadBytes(imageRef, file).then((snapshot) => {
                getDownloadURL(snapshot.ref).then((downloadURL) => {
                    console.log('File available at', downloadURL);
                    // Save this downloadURL to user's profile in Realtime Database
                    set(ref(db, 'users/' + user.uid + '/profile/photoURL'), downloadURL)
                        .then(() => {
                            hideMessageBox();
                            showMessageBox("สำเร็จ", "อัปโหลดรูปโปรไฟล์สำเร็จ!");
                        })
                        .catch(error => {
                            hideMessageBox();
                            showMessageBox("ข้อผิดพลาด", "บันทึก URL รูปโปรไฟล์ไม่สำเร็จ: " + error.message);
                            console.error("Error saving photoURL to RTDB:", error);
                        });
                });
            }).catch(error => {
                hideMessageBox();
                showMessageBox("ข้อผิดพลาด", "อัปโหลดรูปโปรไฟล์ไม่สำเร็จ: " + error.message);
                console.error("Error uploading profile picture:", error);
            });
        } else {
            showMessageBox("ข้อผิดพลาด", "ไม่สามารถอัปโหลดรูปโปรไฟล์ได้ ไม่ได้เข้าสู่ระบบ หรือ Firebase Storage ไม่พร้อมใช้งาน");
        }
    }
}

/**
 * Saves the updated profile information to Firebase Realtime Database.
 */
export function saveProfile() {
    const user = auth.currentUser;
    if (!user) {
        showMessageBox("ไม่ได้เข้าสู่ระบบ", "โปรดเข้าสู่ระบบเพื่อบันทึกโปรไฟล์");
        return;
    }

    const name = document.getElementById('editFullName').value.trim();
    const phone = document.getElementById('editPhone').value.trim();
    const address = document.getElementById('editAddress').value.trim();

    const profileData = {
        name: name,
        phone: phone,
        address: address,
        // photoURL is handled by handleProfilePictureChange
    };

    // Get current photoURL to merge, as set() would overwrite existing data
    onValue(ref(db, 'users/' + user.uid + '/profile/photoURL'), (snapshot) => {
        const currentPhotoURL = snapshot.val();
        if (currentPhotoURL) {
            profileData.photoURL = currentPhotoURL; // Keep existing photoURL if not changed by file input
        }

        set(ref(db, 'users/' + user.uid + '/profile'), profileData)
            .then(() => {
                showMessageBox("สำเร็จ", "บันทึกโปรไฟล์สำเร็จ!");
                toggleProfileEditMode(false); // Exit edit mode after saving
            })
            .catch(error => {
                showMessageBox("ข้อผิดพลาด", "บันทึกโปรไฟล์ไม่สำเร็จ: " + error.message + " โปรดตรวจสอบ Console และ Firebase Security Rules ของคุณ");
                console.error("Error saving profile:", error);
            });
    }, { onlyOnce: true }); // Use onlyOnce to avoid continuous listening here
}

/**
 * Displays admin contact information.
 */
export function contactAdmin() {
    showMessageBox("ติดต่อแอดมิน", "หากมีข้อสงสัยหรือปัญหา กรุณาติดต่อ:\n\nอีเมล: support@petporter.com\nโทรศัพท์: 02-123-4567\nLine ID: @petporter");
}

/**
 * Handles the change event for the home page image input.
 * Displays a preview of the selected image.
 * @param {Event} event - The change event from the file input.
 */
export function handleHomeImageChange(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('homeImagePreview').src = e.target.result;
        };
        reader.readAsDataURL(file);
        // If upload functionality is needed later, it would go here.
        // For now, it just displays the preview.
    }
}

// Event Listeners and Initial Setup
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons(); // Initialize Lucide icons on page load
    loadGoogleMapsScript(); // Load Google Maps API
    
    // Firebase Auth State Listener
    onAuthStateChanged(auth, (user) => {
        const navLoginButton = document.getElementById('navLogin');
        const navAccountButton = document.getElementById('navAccount'); 

        if (user) {
            // User is signed in
            console.log("User is signed in:", user.email, user.uid);
            if (navLoginButton) navLoginButton.style.display = 'none'; // Hide login button
            if (navAccountButton) navAccountButton.style.display = 'flex'; // Ensure account button is visible
        } else {
            // User is signed out
            console.log("User is signed out.");
            if (navLoginButton) navLoginButton.style.display = 'flex'; // Show login button
            if (navAccountButton) navAccountButton.style.display = 'flex'; // Ensure account button is visible
            // Clear account section for logged-out user
            document.getElementById('accountInfo').innerHTML = `
                <h3 class="text-lg font-semibold text-gray-700 mb-2">คุณยังไม่ได้เข้าสู่ระบบ</h3>
                <p class="text-gray-600 mb-4">โปรดเข้าสู่ระบบเพื่อจัดการข้อมูลบัญชีของคุณ</p>
                <button onclick="showSection('loginSection')" class="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-xl transition duration-300 ease-in-out shadow-md">
                    ไปที่หน้าเข้าสู่ระบบ
                </button>
            `;
        }
    });
    // Initial load for home section
    showSection('homeSection');
});
