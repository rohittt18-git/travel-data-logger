async function createAccount() {
    const signupName = document.getElementById("signupName").value.trim();
    const signupEmail = document.getElementById("signupEmail").value.trim();
    const signupPassword = document.getElementById("signupPassword").value.trim();
    if (!signupName || !signupEmail || !signupPassword) {
        alert("Please fill all fields.");
        return;
    }
    try {
        const response = await fetch('http://localhost:3000/api/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: signupName, email: signupEmail, password: signupPassword }),
        });
        const result = await response.json();
        alert(result.message);
        if (response.ok) showLogin();
    } catch (error) {
        alert("Account creation failed.");
        console.error(error);
    }
}

async function login() {
    const loginEmail = document.getElementById("loginEmail").value.trim();
    const loginPassword = document.getElementById("loginPassword").value.trim();
    try {
        const response = await fetch('http://localhost:3000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: loginEmail, password: loginPassword }),
        });
        const result = await response.json();
        if (response.ok) {
            // alert(result.message + " Welcome " + result.user.username);
            localStorage.setItem("userId", result.user.id);
            window.location.href = 'trip_mode.html';
        } else {
            alert(result.message);
        }
    } catch (error) {
        alert("Login failed.");
        console.error(error);
    }
}

function showLogin() {
    document.getElementById("signupForm").classList.add("hidden");
    document.getElementById("loginForm").classList.remove("hidden");
}

function showSignup() {
    document.getElementById("loginForm").classList.add("hidden");
    document.getElementById("signupForm").classList.remove("hidden");
}