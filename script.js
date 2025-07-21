import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

// Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// Initialize Lucide Icons (global)
// This is typically handled by a build step in a full React app,
// but for a single HTML file, we'll keep it simple.
window.lucide.createIcons();

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

// Initialize Firebase services globally for now, or consider React Context for larger apps
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const storage = getStorage(app);

let map; // Google Map instance
let marker; // Google Map marker instance
let currentMapTarget = null; // To know if we are selecting 'pickup' or 'dropoff' location

/**
 * Loads the Google Maps API script dynamically.
 * The `initMap` function will be called once the script is loaded.
 */
function loadGoogleMapsScript(callback) {
    if (window.google && window.google.maps) {
        callback();
        return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${Maps_API_KEY}&callback=initMapCallback`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
    window.initMapCallback = callback; // Assign callback to a global window function
}

/**
 * Custom Message Box Modal Component.
 * @param {object} props - Component props.
 * @param {string} props.title - The title of the message box.
 * @param {string} props.message - The message to display.
 * @param {function} props.onClose - Function to call when the message box is closed.
 * @param {boolean} props.isVisible - Controls the visibility of the message box.
 */
const MessageBox = ({ title, message, onClose, isVisible }) => {
    if (!isVisible) return null;

    return (
        <div id="messageBoxOverlay" className="message-box-overlay show">
            <div className="message-box-content">
                <h3 id="messageBoxTitle">{title}</h3>
                <p id="messageBoxText">{message}</p>
                <button onClick={onClose}>ตกลง</button>
            </div>
        </div>
    );
};

/**
 * Map Modal Component for location selection.
 * @param {object} props - Component props.
 * @param {boolean} props.isVisible - Controls the visibility of the map modal.
 * @param {string} props.target - 'pickup' or 'dropoff' to indicate which location is being set.
 * @param {function} props.onClose - Function to call when the modal is closed.
 * @param {function} props.onLocationSelect - Function to call when a location is selected, passes { lat, lng, address }.
 * @param {object} props.initialLocation - { lat, lng } for initial marker position.
 */
const MapModal = ({ isVisible, target, onClose, onLocationSelect, initialLocation }) => {
    const mapRef = React.useRef(null);

    useEffect(() => {
        if (isVisible) {
            loadGoogleMapsScript(() => {
                const phitsanulokCenter = { lat: 16.8248, lng: 100.2796 };

                map = new google.maps.Map(mapRef.current, {
                    center: initialLocation || phitsanulokCenter,
                    zoom: 15,
                    fullscreenControl: false,
                    streetViewControl: false,
                    mapTypeControl: false,
                    zoomControl: true,
                });

                marker = new google.maps.Marker({
                    map: map,
                    position: initialLocation || phitsanulokCenter,
                    draggable: true,
                    title: 'ลากเพื่อปักหมุด',
                    animation: google.maps.Animation.DROP,
                });

                map.addListener('click', (e) => {
                    marker.setPosition(e.latLng);
                });

                // Trigger resize to ensure map renders correctly if modal was hidden on mount
                google.maps.event.trigger(map, 'resize');
                map.setCenter(marker.getPosition()); // Center map on marker after potential resize
            });
        }
    }, [isVisible, initialLocation]); // Re-initialize map when modal visibility or initialLocation changes

    const handleSelectLocation = () => {
        if (!marker) {
            console.error("Marker not initialized.");
            return;
        }
        const latLng = marker.getPosition();
        const lat = latLng.lat();
        const lng = latLng.lng();

        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ 'location': latLng }, (results, status) => {
            if (status === 'OK' && results[0]) {
                onLocationSelect({ lat, lng, address: results[0].formatted_address, target });
                onClose();
            } else {
                console.error('Geocoder failed due to: ' + status);
                alert("ไม่สามารถหาที่อยู่จากตำแหน่งที่เลือกได้: " + status); // Using alert for simplicity, replace with custom modal
            }
        });
    };

    if (!isVisible) return null;

    return (
        <div id="mapModal" className="map-modal-overlay show">
            <div className="map-modal-content">
                <div className="map-modal-header">
                    <span id="mapModalTitle">{target === 'pickup' ? 'เลือกจุดรับ' : 'เลือกจุดส่ง'}</span>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <i data-lucide="x" className="w-6 h-6"></i>
                    </button>
                </div>
                <div id="map" ref={mapRef} className="w-full"></div>
                <div className="map-modal-footer">
                    <button onClick={onClose} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg">
                        ยกเลิก
                    </button>
                    <button onClick={handleSelectLocation} className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-2 px-4 rounded-lg">
                        เลือกตำแหน่งนี้
                    </button>
                </div>
            </div>
        </div>
    );
};

/**
 * Main App Component
 */
const App = () => {
    const [currentSection, setCurrentSection] = useState('homeSection');
    const [user, setUser] = useState(null);
    const [messageBox, setMessageBox] = useState({ isVisible: false, title: '', message: '' });
    const [mapModal, setMapModal] = useState({ isVisible: false, target: null, initialLocation: null });

    const [petName, setPetName] = useState('');
    const [petSpecies, setPetSpecies] = useState('');
    const [numPets, setNumPets] = useState(1);
    const [pickupLocation, setPickupLocation] = useState({ display: 'คลิกเพื่อเลือกจุดรับบนแผนที่', lat: '', lng: '' });
    const [dropoffLocation, setDropoffLocation] = useState({ display: 'คลิกเพื่อเลือกจุดส่งบนแผนที่', lat: '', lng: '' });
    const [homeImagePreview, setHomeImagePreview] = useState('https://placehold.co/300x150/fcd34d/000000?text=Your+Pet+Here');

    // Profile states
    const [profileName, setProfileName] = useState('');
    const [profilePhone, setProfilePhone] = useState('');
    const [profileAddress, setProfileAddress] = useState('');
    const [profilePhotoURL, setProfilePhotoURL] = useState('https://placehold.co/100x100/6a5acd/ffffff?text=👤');
    const [isEditingProfile, setIsEditingProfile] = useState(false);


    // Firebase Auth State Listener
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            const navLoginButton = document.getElementById('navLogin');
            const navAccountButton = document.getElementById('navAccount');

            if (currentUser) {
                if (navLoginButton) navLoginButton.style.display = 'none';
                if (navAccountButton) navAccountButton.style.display = 'flex';
                loadUserProfile(currentUser.uid); // Load profile data when user logs in
            } else {
                if (navLoginButton) navLoginButton.style.display = 'flex';
                if (navAccountButton) navAccountButton.style.display = 'flex';
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
        return () => unsubscribe(); // Cleanup subscription
    }, []);

    // Function to show message box
    const showMessageBox = (title, message) => {
        setMessageBox({ isVisible: true, title, message });
    };

    // Function to hide message box
    const hideMessageBox = () => {
        setMessageBox({ isVisible: false, title: '', message: '' });
    };

    // Function to show a specific section
    const showSection = (sectionId) => {
        setCurrentSection(sectionId);
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
                if (user) loadUserProfile(user.uid); // Load user profile data when navigating to account section
                break;
            default:
                headerTitle.textContent = 'PetPorter';
        }
    };

    // Login function
    const handleLogin = () => {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        if (!email || !password) {
            showMessageBox("ข้อมูลไม่ครบถ้วน", "โปรดกรอกอีเมลและรหัสผ่านให้ครบถ้วน");
            return;
        }

        signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                showMessageBox("เข้าสู่ระบบสำเร็จ!", "ยินดีต้อนรับ " + userCredential.user.email);
                showSection('homeSection');
            })
            .catch((error) => {
                let errorMessage = "เข้าสู่ระบบไม่สำเร็จ: " + error.message;
                if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                    errorMessage = "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
                } else if (error.code === 'auth/invalid-email') {
                    errorMessage = "รูปแบบอีเมลไม่ถูกต้อง";
                }
                showMessageBox("เข้าสู่ระบบไม่สำเร็จ", errorMessage);
            });
    };

    // Register function
    const handleRegister = () => {
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
                const newUser = userCredential.user;
                set(ref(db, 'users/' + newUser.uid), {
                    email: newUser.email,
                    uid: newUser.uid,
                    createdAt: new Date().toISOString()
                }).then(() => {
                    showMessageBox("สมัครสมาชิกสำเร็จ!", "ยินดีต้อนรับ " + newUser.email + " คุณสามารถเข้าสู่ระบบได้แล้ว");
                    document.getElementById('email').value = "";
                    document.getElementById('password').value = "";
                }).catch((dbError) => {
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
            });
    };

    // Logout function
    const handleLogout = () => {
        signOut(auth).then(() => {
            showMessageBox("ออกจากระบบสำเร็จ", "คุณได้ออกจากระบบแล้ว");
            showSection('homeSection');
        }).catch((error) => {
            showMessageBox("เกิดข้อผิดพลาด", "ไม่สามารถออกจากระบบได้: " + error.message);
        });
    };

    // Confirm Booking function
    const handleConfirmBooking = () => {
        if (!petName || !petSpecies || !numPets || !pickupLocation.lat || !dropoffLocation.lat || pickupLocation.display === "คลิกเพื่อเลือกจุดรับบนแผนที่" || dropoffLocation.display === "คลิกเพื่อเลือกจุดส่งบนแผนที่") {
            showMessageBox("ข้อมูลไม่ครบถ้วน", "กรุณากรอกข้อมูลสัตว์เลี้ยง, จำนวน, และเลือกตำแหน่งบนแผนที่ให้ครบถ้วน");
            return;
        }

        const bookingData = {
            petName: petName,
            petType: petSpecies,
            numPets: parseInt(numPets),
            pickup: {
                address: pickupLocation.display,
                lat: parseFloat(pickupLocation.lat),
                lng: parseFloat(pickupLocation.lng)
            },
            dropoff: {
                address: dropoffLocation.display,
                lat: parseFloat(dropoffLocation.lat),
                lng: parseFloat(dropoffLocation.lng)
            },
            status: "waiting",
            timestamp: Date.now(),
            ownerUid: user ? user.uid : null
        };

        ref(db, 'orders').push(bookingData)
            .then(() => {
                showMessageBox("เรียบร้อย!", "✅ เรียกรถเรียบร้อยแล้ว! กรุณารอคนขับรับงาน");
                setPetName('');
                setPetSpecies('');
                setNumPets(1);
                setPickupLocation({ display: 'คลิกเพื่อเลือกจุดรับบนแผนที่', lat: '', lng: '' });
                setDropoffLocation({ display: 'คลิกเพื่อเลือกจุดส่งบนแผนที่', lat: '', lng: '' });
                showSection('findingDriverSection');
            })
            .catch(error => {
                showMessageBox("เกิดข้อผิดพลาด", "❌ เกิดข้อผิดพลาดในการจอง: " + error.message);
            });
    };

    // Cancel Booking function
    const handleCancelBooking = () => {
        showMessageBox("ยกเลิกการจอง", "คุณได้ยกเลิกการจองแล้ว");
        showSection('homeSection');
    };

    // Show Trip Details (placeholder)
    const showTripDetails = (tripId) => {
        showMessageBox("รายละเอียดการเดินทาง", `กำลังแสดงรายละเอียดการเดินทาง #${tripId.substring(0, 5)}...`);
        showSection('liveTrackingSection');
    };

    // Open Map Modal
    const openMapModal = (target) => {
        let initialLoc = null;
        if (target === 'pickup' && pickupLocation.lat && pickupLocation.lng) {
            initialLoc = { lat: parseFloat(pickupLocation.lat), lng: parseFloat(pickupLocation.lng) };
        } else if (target === 'dropoff' && dropoffLocation.lat && dropoffLocation.lng) {
            initialLoc = { lat: parseFloat(dropoffLocation.lat), lng: parseFloat(dropoffLocation.lng) };
        }
        setMapModal({ isVisible: true, target, initialLocation: initialLoc });
    };

    // Handle Location Selection from Map Modal
    const handleLocationSelect = ({ lat, lng, address, target }) => {
        if (target === 'pickup') {
            setPickupLocation({ display: address, lat, lng });
        } else if (target === 'dropoff') {
            setDropoffLocation({ display: address, lat, lng });
        }
    };

    // Load User Profile
    const loadUserProfile = (uid) => {
        if (!uid) {
            // This case should ideally be handled by the onAuthStateChanged listener
            return;
        }
        onValue(ref(db, 'users/' + uid + '/profile'), (snapshot) => {
            const profile = snapshot.val();
            setProfileName(profile?.name || user?.email.split('@')[0] || '');
            setProfilePhone(profile?.phone || '');
            setProfileAddress(profile?.address || '');
            setProfilePhotoURL(profile?.photoURL || 'https://placehold.co/100x100/6a5acd/ffffff?text=👤');
        });
    };

    // Toggle Profile Edit Mode
    const toggleProfileEditMode = (editMode) => {
        setIsEditingProfile(editMode);
    };

    // Handle Profile Picture Change
    const handleProfilePictureChange = (event) => {
        const file = event.target.files[0];
        if (file && user && storage) {
            const reader = new FileReader();
            reader.onload = (e) => setProfilePhotoURL(e.target.result);
            reader.readAsDataURL(file);

            showMessageBox("กำลังอัปโหลด", "กำลังอัปโหลดรูปโปรไฟล์...");
            const imageRef = storageRef(storage, `profile_pictures/${user.uid}/profile.jpg`);

            uploadBytes(imageRef, file).then((snapshot) => {
                getDownloadURL(snapshot.ref).then((downloadURL) => {
                    set(ref(db, 'users/' + user.uid + '/profile/photoURL'), downloadURL)
                        .then(() => {
                            hideMessageBox();
                            showMessageBox("สำเร็จ", "อัปโหลดรูปโปรไฟล์สำเร็จ!");
                        })
                        .catch(error => {
                            hideMessageBox();
                            showMessageBox("ข้อผิดพลาด", "บันทึก URL รูปโปรไฟล์ไม่สำเร็จ: " + error.message);
                        });
                });
            }).catch(error => {
                hideMessageBox();
                showMessageBox("ข้อผิดพลาด", "อัปโหลดรูปโปรไฟล์ไม่สำเร็จ: " + error.message);
            });
        } else if (!user) {
            showMessageBox("ข้อผิดพลาด", "ไม่สามารถอัปโหลดรูปโปรไฟล์ได้ ไม่ได้เข้าสู่ระบบ");
        }
    };

    // Save Profile
    const handleSaveProfile = () => {
        if (!user) {
            showMessageBox("ไม่ได้เข้าสู่ระบบ", "โปรดเข้าสู่ระบบเพื่อบันทึกโปรไฟล์");
            return;
        }

        const profileData = {
            name: profileName,
            phone: profilePhone,
            address: profileAddress,
            photoURL: profilePhotoURL // Use the state value
        };

        set(ref(db, 'users/' + user.uid + '/profile'), profileData)
            .then(() => {
                showMessageBox("สำเร็จ", "บันทึกโปรไฟล์สำเร็จ!");
                toggleProfileEditMode(false);
            })
            .catch(error => {
                showMessageBox("ข้อผิดพลาด", "บันทึกโปรไฟล์ไม่สำเร็จ: " + error.message + " โปรดตรวจสอบ Console และ Firebase Security Rules ของคุณ");
            });
    };

    // Contact Admin
    const handleContactAdmin = () => {
        showMessageBox("ติดต่อแอดมิน", "หากมีข้อสงสัยหรือปัญหา กรุณาติดต่อ:\n\nอีเมล: support@petporter.com\nโทรศัพท์: 02-123-4567\nLine ID: @petporter");
    };

    // Handle Home Image Change
    const handleHomeImageChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => setHomeImagePreview(e.target.result);
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="app-container">
            <div className="header" id="appHeader">
                {currentSection === 'homeSection' && 'หน้าหลัก'}
                {currentSection === 'promotionsSection' && 'โปรโมชั่น'}
                {currentSection === 'pricesSection' && 'ราคาบริการ'}
                {currentSection === 'bookSection' && 'จองบริการ'}
                {currentSection === 'findingDriverSection' && 'กำลังค้นหาคนขับ'}
                {currentSection === 'liveTrackingSection' && 'ติดตามการเดินทาง'}
                {currentSection === 'loginSection' && 'เข้าสู่ระบบ'}
                {currentSection === 'accountSection' && 'บัญชีของฉัน'}
            </div>

            {/* Home Section */}
            {currentSection === 'homeSection' && (
                <div id="homeSection" className="content-section active">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6">ยินดีต้อนรับสู่ PetPorter!</h2>

                    {/* Image Input Section */}
                    <div className="card mb-6 flex flex-col items-center">
                        <h3 className="text-lg font-semibold text-gray-700 mb-3">รูปภาพประจำวันของสัตว์เลี้ยง</h3>
                        <img id="homeImagePreview" src={homeImagePreview} alt="Home Image" className="w-full h-40 object-cover rounded-lg mb-4 shadow-md"/>
                        <input type="file" id="homeImageInput" className="hidden" accept="image/*" onChange={handleHomeImageChange}/>
                        <button onClick={() => document.getElementById('homeImageInput').click()} className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded-xl transition duration-300 ease-in-out shadow-md flex items-center justify-center">
                            <i data-lucide="image" className="w-5 h-5 mr-2"></i>
                            เลือกรูปภาพ
                        </button>
                    </div>
                    {/* End Image Input Section */}

                    <button onClick={() => showSection('bookSection')} className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg transition duration-300 ease-in-out transform hover:-translate-y-1 mb-3 flex items-center justify-center">
                        <i data-lucide="car" className="w-6 h-6 mr-3"></i>
                        เรียกบริการรับ-ส่งสัตว์เลี้ยง
                    </button>

                    <button onClick={() => showSection('promotionsSection')} className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition duration-300 ease-in-out transform hover:-translate-y-1 mb-3 flex items-center justify-center">
                        <i data-lucide="tag" className="w-5 h-5 mr-2"></i>
                        ดูโปรโมชั่น
                    </button>

                    <button onClick={() => showSection('pricesSection')} className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition duration-300 ease-in-out transform hover:-translate-y-1 mb-6 flex items-center justify-center">
                        <i data-lucide="dollar-sign" className="w-5 h-5 mr-2"></i>
                        ดูราคาบริการ
                    </button>

                    <div className="card">
                        <h3 className="text-lg font-semibold text-gray-700 mb-3">สถานะการเดินทางปัจจุบัน (จำลอง)</h3>
                        <p className="text-gray-500 text-sm mb-2">ยังไม่มีการเดินทางที่กำลังดำเนินการ</p>
                    </div>
                </div>
            )}

            {/* Promotions Section */}
            {currentSection === 'promotionsSection' && (
                <div id="promotionsSection" className="content-section active">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6">โปรโมชั่นปัจจุบัน</h2>
                    <div className="mb-6 rounded-xl overflow-hidden shadow-lg">
                        <img src="https://placehold.co/400x200/8a2be2/ffffff?text=" alt="Promotion Banner" className="w-full h-auto object-cover"/>
                    </div>
                    <div className="card mb-6">
                        <ul className="space-y-4">
                            <li className="flex items-center space-x-3 bg-blue-50 p-4 rounded-lg shadow-sm">
                                <i data-lucide="tag" className="w-6 h-6 text-blue-600"></i>
                                <div>
                                    <p className="font-medium text-gray-800">ลด 10% สำหรับการเดินทางครั้งแรก!</p>
                                    <p className="text-sm text-gray-600">สำหรับลูกค้าใหม่เท่านั้น ใช้โค้ด NEWPET</p>
                                </div>
                            </li>
                            <li className="flex items-center space-x-3 bg-green-50 p-4 rounded-lg shadow-sm">
                                <i data-lucide="gift" className="w-6 h-6 text-green-600"></i>
                                <div>
                                    <p className="font-medium text-gray-800">ฟรี! บริการล้างเท้าสัตว์เลี้ยง</p>
                                    <p className="text-sm text-gray-600">เมื่อจองบริการตั้งแต่ 200 บาทขึ้นไป</p>
                                </div>
                            </li>
                            <li className="flex items-center space-x-3 bg-yellow-50 p-4 rounded-lg shadow-sm">
                                <i data-lucide="star" className="w-6 h-6 text-yellow-600"></i>
                                <div>
                                    <p className="font-medium text-gray-800">สะสมแต้มแลกส่วนลด</p>
                                    <p className="text-sm text-gray-600">ทุก 100 บาท รับ 1 แต้ม แลกส่วนลดได้ทันที!</p>
                                </div>
                            </li>
                        </ul>
                    </div>
                    <button onClick={() => showSection('homeSection')} className="w-full bg-gray-400 hover:bg-gray-500 text-white font-bold py-3 px-4 rounded-xl transition duration-300 ease-in-out shadow-md">
                        กลับหน้าหลัก
                    </button>
                </div>
            )}

            {/* Prices Section */}
            {currentSection === 'pricesSection' && (
                <div id="pricesSection" className="content-section active">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6">ราคาบริการ (โดยประมาณ)</h2>
                    <div className="card">
                        <div className="overflow-x-auto">
                            <table className="min-w-full bg-white rounded-lg shadow-sm">
                                <thead>
                                    <tr className="bg-gray-100 text-gray-600 uppercase text-sm leading-normal">
                                        <th className="py-3 px-6 text-left rounded-tl-lg">บริการ</th>
                                        <th className="py-3 px-6 text-left">รายละเอียด</th>
                                        <th className="py-3 px-6 text-right rounded-tr-lg">ราคาเริ่มต้น</th>
                                    </tr>
                                </thead>
                                <tbody className="text-gray-700 text-sm font-light">
                                    <tr className="border-b border-gray-200 hover:bg-gray-50">
                                        <td className="py-3 px-6 text-left whitespace-nowrap">
                                            <div className="flex items-center">
                                                <i data-lucide="car" className="w-4 h-4 mr-2 text-purple-500"></i>
                                                <span className="font-medium">รับ-ส่งสัตว์เลี้ยง</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-6 text-left">เริ่มต้น 5 กม. แรก</td>
                                        <td className="py-3 px-6 text-right">฿150</td>
                                    </tr>
                                    <tr className="border-b border-gray-200 hover:bg-gray-50">
                                        <td className="py-3 px-6 text-left whitespace-nowrap">
                                            <div className="flex items-center">
                                                <i data-lucide="plus" className="w-4 h-4 mr-2 text-green-500"></i>
                                                <span className="font-medium">ค่าบริการเพิ่ม/กม.</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-6 text-left">สำหรับ กม. ถัดไป</td>
                                        <td className="py-3 px-6 text-right">฿15</td>
                                    </tr>
                                    <tr className="border-b border-gray-200 hover:bg-gray-50">
                                        <td className="py-3 px-6 text-left whitespace-nowrap">
                                            <div className="flex items-center">
                                                <i data-lucide="package" className="w-4 h-4 mr-2 text-yellow-500"></i>
                                                <span className="font-medium">สัตว์เลี้ยงตัวที่ 2+</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-6 text-left">ต่อตัว (ขนาดเล็ก-กลาง)</td>
                                        <td className="py-3 px-6 text-right">฿50</td>
                                    </tr>
                                    <tr className="hover:bg-gray-50">
                                        <td className="py-3 px-6 text-left whitespace-nowrap rounded-bl-lg">
                                            <div className="flex items-center">
                                                <i data-lucide="clock" className="w-4 h-4 mr-2 text-red-500"></i>
                                                <span className="font-medium">บริการนอกเวลา</span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-6 text-left">22:00 - 06:00 น.</td>
                                        <td className="py-3 px-6 text-right rounded-br-lg">เพิ่ม ฿50</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <p className="text-xs text-gray-500 mt-4 text-center">
                            * ราคาเป็นเพียงการประมาณการ ราคาจริงอาจแตกต่างกันไปตามระยะทาง, ขนาดสัตว์เลี้ยง และช่วงเวลา
                        </p>
                    </div>
                    <button onClick={() => showSection('homeSection')} className="w-full bg-gray-400 hover:bg-gray-500 text-white font-bold py-3 px-4 rounded-xl transition duration-300 ease-in-out shadow-md">
                        กลับหน้าหลัก
                    </button>
                </div>
            )}

            {/* Book Section */}
            {currentSection === 'bookSection' && (
                <div id="bookSection" className="content-section active">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6">จองบริการรับ-ส่ง</h2>

                    <div className="mb-5">
                        <label htmlFor="petNameInput" className="form-label">ชื่อสัตว์เลี้ยง:</label>
                        <input type="text" id="petNameInput" className="form-input" placeholder="เช่น: โชคดี" value={petName} onChange={(e) => setPetName(e.target.value)}/>
                    </div>

                    <div className="mb-5">
                        <label htmlFor="petSpeciesInput" className="form-label">สายพันธุ์:</label>
                        <input type="text" id="petSpeciesInput" className="form-input" placeholder="เช่น: สุนัข - โกลเด้นรีทรีฟเวอร์" value={petSpecies} onChange={(e) => setPetSpecies(e.target.value)}/>
                    </div>

                    <div className="mb-5">
                        <label htmlFor="numPets" className="form-label">จำนวนสัตว์เลี้ยง:</label>
                        <input type="number" id="numPets" value={numPets} min="1" className="form-input" onChange={(e) => setNumPets(parseInt(e.target.value))}/>
                    </div>

                    <div className="mb-5">
                        <label htmlFor="pickupLocationDisplay" className="form-label">จุดรับ:</label>
                        <button type="button" onClick={() => openMapModal('pickup')} className="form-button-map">
                            <span id="pickupLocationDisplay" className="truncate text-gray-600">{pickupLocation.display}</span>
                            <i data-lucide="map-pin" className="w-5 h-5 ml-2 text-purple-500"></i>
                        </button>
                        <input type="hidden" id="pickupLocationLat" value={pickupLocation.lat}/>
                        <input type="hidden" id="pickupLocationLng" value={pickupLocation.lng}/>
                    </div>

                    <div className="mb-8">
                        <label htmlFor="dropoffLocationDisplay" className="form-label">จุดส่ง:</label>
                        <button type="button" onClick={() => openMapModal('dropoff')} className="form-button-map">
                            <span id="dropoffLocationDisplay" className="truncate text-gray-600">{dropoffLocation.display}</span>
                            <i data-lucide="map-pin" className="w-5 h-5 ml-2 text-purple-500"></i>
                        </button>
                        <input type="hidden" id="dropoffLocationLat" value={dropoffLocation.lat}/>
                        <input type="hidden" id="dropoffLocationLng" value={dropoffLocation.lng}/>
                    </div>

                    <button onClick={handleConfirmBooking} className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg transition duration-300 ease-in-out transform hover:-translate-y-1">
                        ยืนยันการจอง
                    </button>
                </div>
            )}

            {/* Finding Driver Section */}
            {currentSection === 'findingDriverSection' && (
                <div id="findingDriverSection" className="content-section active">
                    <div className="flex flex-col items-center justify-center h-full text-center py-20">
                        <div className="spinner mb-8"></div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-3">กำลังค้นหาคนขับ...</h2>
                        <p className="text-gray-600 mb-8">โปรดรอสักครู่ เรากำลังหาคนขับที่เหมาะสมที่สุดสำหรับสัตว์เลี้ยงของคุณ</p>
                        <img src="https://placehold.co/180x180/e0e7ff/6a5acd?text=🔍🐶" alt="Searching for driver illustration" className="rounded-full mb-8 shadow-md"/>
                        <button onClick={handleCancelBooking} className="w-full max-w-xs bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition duration-300 ease-in-out">
                            ยกเลิกการจอง
                        </button>
                    </div>
                </div>
            )}

            {/* Live Tracking Section */}
            {currentSection === 'liveTrackingSection' && (
                <div id="liveTrackingSection" className="content-section active">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6" id="liveTrackingTitle">ติดตามการเดินทาง</h2>

                    <div className="bg-gray-200 h-56 rounded-xl flex items-center justify-center mb-5 text-gray-500 text-sm shadow-md">
                        แผนที่แสดงตำแหน่งสัตว์เลี้ยงแบบเรียลไทม์ (จำลอง)
                    </div>

                    <div className="card mb-5">
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">Pet Cam (สด)</h3>
                        <div className="pet-cam-placeholder">
                            <i data-lucide="video" className="w-7 h-7 mr-2"></i> กำลังสตรีม Pet Cam...
                        </div>
                    </div>

                    <div className="card mb-5">
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">ข้อมูลคนขับ</h3>
                        <div className="flex items-center space-x-4">
                            <img src="https://placehold.co/60x60/8a2be2/ffffff?text=👨" alt="Driver Avatar" className="rounded-full border-2 border-purple-300" id="driverAvatar"/>
                            <div>
                                <p className="font-medium text-gray-700" id="driverName">คุณสมชาย ใจดี</p>
                                <p className="text-sm text-gray-500" id="driverCar">รถยนต์: Honda City สีขาว (ทะเบียน กข 1234)</p>
                                <p className="text-sm text-gray-500" id="driverRating">คะแนน: 4.9/5.0 (ผ่านการอบรมดูแลสัตว์)</p>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">Pet Message</h3>
                        <div className="space-y-3" id="petMessagesContainer">
                            <div className="bg-blue-50 p-3 rounded-lg shadow-sm">
                                <p className="text-sm text-gray-800">"เจ้าเหมียวร้องเพลงตลอดทางเลยครับ! น่ารักมากเลยครับ 😻"</p>
                                <p className="text-xs text-gray-500 text-right mt-1">จากคนขับ - 10:15 น.</p>
                            </div>
                            <div className="bg-blue-50 p-3 rounded-lg shadow-sm">
                                <p className="text-sm text-gray-800">"น้องหมาหลับตั้งแต่ขึ้นรถเลยครับ ตอนนี้ใกล้ถึงแล้วครับ 🐶"</p>
                                <p className="text-xs text-gray-500 text-right mt-1">จากคนขับ - 10:00 น.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Login Section */}
            {currentSection === 'loginSection' && (
                <div id="loginSection" className="content-section active">
                    <h2 className="text-2xl font-bold text-gray-800 mb-8 text-center">เข้าสู่ระบบ PetPorter</h2>

                    <div className="space-y-4 mb-6">
                        <div className="form-group">
                            <label htmlFor="email" className="form-label">อีเมล</label>
                            <input type="email" id="email" className="form-input" placeholder="กรอกอีเมลของคุณ" />
                        </div>

                        <div className="form-group">
                            <label htmlFor="password" className="form-label">รหัสผ่าน</label>
                            <input type="password" id="password" className="form-input" placeholder="กรอกรหัสผ่านของคุณ" />
                        </div>

                        <div className="flex justify-center gap-4 mt-6">
                            <button className="login-btn bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-xl transition duration-300 ease-in-out shadow-md" onClick={handleLogin}>
                                เข้าสู่ระบบ
                            </button>
                            <button className="register-btn bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-xl transition duration-300 ease-in-out shadow-md" onClick={handleRegister}>
                                สมัครสมาชิก
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center my-6">
                        <div className="flex-grow border-t border-gray-300"></div>
                        <span className="flex-shrink mx-4 text-gray-500 text-sm">หรือเข้าสู่ระบบด้วย</span>
                        <div className="flex-grow border-t border-gray-300"></div>
                    </div>

                    <div className="space-y-4">
                        <button className="w-full flex items-center justify-center bg-white border border-gray-300 text-gray-700 font-semibold py-3 px-4 rounded-xl shadow-md hover:bg-gray-50 transition duration-200">
                            <img src="https://img.icons8.com/color/24/000000/google-logo.png" alt="Google icon" className="w-5 h-5 mr-3"/>
                            ลงชื่อเข้าใช้ด้วย Google
                        </button>
                        <button className="w-full flex items-center justify-center bg-white border border-gray-300 text-gray-700 font-semibold py-3 px-4 rounded-xl shadow-md hover:bg-gray-50 transition duration-200">
                            <img src="https://img.icons8.com/fluency/24/000000/facebook-new.png" alt="Facebook icon" className="w-5 h-5 mr-3"/>
                            ลงชื่อเข้าใช้ด้วย Facebook
                        </button>
                        <button className="w-full flex items-center justify-center bg-white border border-gray-300 text-gray-700 font-semibold py-3 px-4 rounded-xl shadow-md hover:bg-gray-50 transition duration-200">
                            <img src="https://img.icons8.com/ios-filled/24/000000/mac-os.png" alt="Apple icon" className="w-5 h-5 mr-3"/>
                            ลงชื่อเข้าใช้ด้วย Apple
                        </button>
                    </div>

                    <p className="text-center text-sm text-gray-500 mt-8">
                        ยังไม่มีบัญชีใช่ไหม? <a href="#" className="text-purple-600 hover:underline">สร้างบัญชีใหม่</a>
                    </p>
                </div>
            )}

            {/* Account Section */}
            {currentSection === 'accountSection' && (
                <div id="accountSection" className="content-section active">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6">บัญชีของฉัน</h2>
                    <div id="accountInfo" className="card mb-5">
                        {user ? (
                            <div className="flex flex-col items-center mb-6">
                                <div className="relative">
                                    <img id="profilePicture" src={profilePhotoURL} alt="Profile Picture" className="rounded-full border-4 border-purple-300 shadow-lg mb-4 w-28 h-28 object-cover"/>
                                    <input type="file" id="profilePictureInput" className="hidden" accept="image/*" onChange={handleProfilePictureChange}/>
                                    {isEditingProfile && (
                                        <button id="changePictureButton" onClick={() => document.getElementById('profilePictureInput').click()} className="profile-edit absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-md border border-gray-200 hover:bg-gray-100 transition">
                                            <i data-lucide="camera" className="w-5 h-5 text-gray-700"></i>
                                        </button>
                                    )}
                                </div>
                                {!isEditingProfile ? (
                                    <h3 className="text-xl font-bold text-gray-800 mb-1 profile-display">คุณ {profileName || user.email.split('@')[0]}</h3>
                                ) : (
                                    <input type="text" id="editName" className="form-input text-center text-xl font-bold mb-1" value={profileName} onChange={(e) => setProfileName(e.target.value)} placeholder="ชื่อ-นามสกุล"/>
                                )}
                                <p className="text-sm text-gray-500 profile-display">{user.email}</p>
                                <div className="space-y-4 mb-6 mt-4 w-full">
                                    <div>
                                        <p className="font-semibold text-gray-700">ชื่อ-นามสกุล:</p>
                                        {!isEditingProfile ? (
                                            <p className="text-gray-600 profile-display">{profileName || 'ยังไม่มีข้อมูล'}</p>
                                        ) : (
                                            <input type="text" id="editFullName" className="form-input" value={profileName} onChange={(e) => setProfileName(e.target.value)} placeholder="ชื่อ-นามสกุล"/>
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-700">เบอร์โทรศัพท์:</p>
                                        {!isEditingProfile ? (
                                            <p className="text-gray-600 profile-display">{profilePhone || 'ยังไม่มีข้อมูล'}</p>
                                        ) : (
                                            <input type="tel" id="editPhone" className="form-input" value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} placeholder="เบอร์โทรศัพท์"/>
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-gray-700">ที่อยู่:</p>
                                        {!isEditingProfile ? (
                                            <p className="text-gray-600 profile-display">{profileAddress || 'ยังไม่มีข้อมูล'}</p>
                                        ) : (
                                            <textarea id="editAddress" className="form-input h-24" value={profileAddress} onChange={(e) => setProfileAddress(e.target.value)} placeholder="ที่อยู่"></textarea>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-3 w-full">
                                    {!isEditingProfile ? (
                                        <button id="editProfileButton" onClick={() => toggleProfileEditMode(true)} className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-xl transition duration-300 ease-in-out shadow-md">
                                            แก้ไขโปรไฟล์
                                        </button>
                                    ) : (
                                        <>
                                            <button id="saveProfileButton" onClick={handleSaveProfile} className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-xl transition duration-300 ease-in-out shadow-md">
                                                บันทึกการเปลี่ยนแปลง
                                            </button>
                                            <button id="cancelEditButton" onClick={() => toggleProfileEditMode(false)} className="w-full bg-gray-400 hover:bg-gray-500 text-white font-bold py-3 px-4 rounded-xl transition duration-300 ease-in-out shadow-md">
                                                ยกเลิก
                                            </button>
                                        </>
                                    )}
                                    <button onClick={handleContactAdmin} className="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 px-4 rounded-xl transition duration-300 ease-in-out shadow-md">
                                        ติดต่อแอดมิน
                                    </button>
                                    <button onClick={handleLogout} className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-xl transition duration-300 ease-in-out shadow-md">
                                        ออกจากระบบ
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center">
                                <h3 className="text-lg font-semibold text-gray-700 mb-2">คุณยังไม่ได้เข้าสู่ระบบ</h3>
                                <p className="text-gray-600 mb-4">โปรดเข้าสู่ระบบเพื่อจัดการข้อมูลบัญชีของคุณ</p>
                                <button onClick={() => showSection('loginSection')} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-xl transition duration-300 ease-in-out shadow-md">
                                    ไปที่หน้าเข้าสู่ระบบ
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Navigation Bar */}
            <div className="flex justify-around bg-white border-t border-gray-100 p-2 rounded-b-2xl shadow-xl z-50 relative">
                <button id="navHome" onClick={() => showSection('homeSection')} className={`nav-button ${currentSection === 'homeSection' ? 'active' : ''}`}>
                    <i data-lucide="home" className="w-6 h-6 mb-1"></i>
                    <span className="text-xs">หน้าหลัก</span>
                </button>
                <button id="navBook" onClick={() => showSection('bookSection')} className={`nav-button ${currentSection === 'bookSection' ? 'active' : ''}`}>
                    <i data-lucide="plus-circle" className="w-6 h-6 mb-1"></i>
                    <span className="text-xs">จอง</span>
                </button>
                <button id="navTracking" onClick={() => showSection('liveTrackingSection')} className={`nav-button ${currentSection === 'liveTrackingSection' ? 'active' : ''}`}>
                    <i data-lucide="map-pin" className="w-6 h-6 mb-1"></i>
                    <span className="text-xs">ติดตาม</span>
                </button>
                <button id="navLogin" onClick={() => showSection('loginSection')} className={`nav-button ${currentSection === 'loginSection' ? 'active' : ''}`} style={{ display: user ? 'none' : 'flex' }}>
                    <i data-lucide="log-in" className="w-6 h-6 mb-1"></i>
                    <span className="text-xs">เข้าสู่ระบบ</span>
                </button>
                <button id="navAccount" onClick={() => showSection('accountSection')} className={`nav-button ${currentSection === 'accountSection' ? 'active' : ''}`} style={{ display: 'flex' }}>
                    <i data-lucide="user" className="w-6 h-6 mb-1"></i>
                    <span className="text-xs">บัญชี</span>
                </button>
            </div>

            {/* Custom Message Box */}
            <MessageBox
                isVisible={messageBox.isVisible}
                title={messageBox.title}
                message={messageBox.message}
                onClose={hideMessageBox}
            />

            {/* Map Modal */}
            <MapModal
                isVisible={mapModal.isVisible}
                target={mapModal.target}
                initialLocation={mapModal.initialLocation}
                onClose={() => setMapModal({ ...mapModal, isVisible: false })}
                onLocationSelect={handleLocationSelect}
            />
        </div>
    );
};

// Mount the React App to the root div
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
