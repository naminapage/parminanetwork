async function adminSearchUser() {
  const username = document.getElementById("adminSearchInput").value.trim().toLowerCase();
  const status = document.getElementById("adminStatus");
  const userInfo = document.getElementById("adminUserInfo");

  status.textContent = "";
  userInfo.classList.add("hidden");

  if (!username) {
    status.textContent = "Masukkan username terlebih dahulu.";
    return;
  }

  try {
    const doc = await window.db.collection("users").doc(username).get();
    if (!doc.exists) {
      status.textContent = "User tidak ditemukan.";
      return;
    }

    const data = doc.data();

    document.getElementById("adminUserName").textContent = data.name;
    document.getElementById("adminUserEmail").textContent = data.email;
    document.getElementById("adminUserAktif").checked = !!data.statusAktif;
    document.getElementById("adminUserAdmin").checked = !!data.isAdmin;
    document.getElementById("adminUserBelanja").value = data.pembelianPribadi || 0;

    userInfo.dataset.username = username;
    userInfo.classList.remove("hidden");
  } catch (err) {
    console.error("Gagal cari user:", err);
    status.textContent = "Terjadi kesalahan saat mencari user.";
  }
}

async function adminSaveUser() {
  const status = document.getElementById("adminStatus");
  const userInfo = document.getElementById("adminUserInfo");

  const username = userInfo.dataset.username;
  const aktif = document.getElementById("adminUserAktif").checked;
  const isAdmin = document.getElementById("adminUserAdmin").checked;
  const belanja = parseInt(document.getElementById("adminUserBelanja").value);

  try {
    await window.db.collection("users").doc(username).update({
      statusAktif: aktif,
      isAdmin: isAdmin,
      pembelianPribadi: belanja
    });

    status.textContent = "Data user berhasil diperbarui!";
  } catch (err) {
    console.error("Gagal simpan data user:", err);
    status.textContent = "Gagal menyimpan perubahan.";
  }
}

function loadAdminPanel() {
  // Reset form kalau dibuka ulang
  document.getElementById("adminSearchInput").value = "";
  document.getElementById("adminUserInfo").classList.add("hidden");
  document.getElementById("adminStatus").textContent = "";
  document.getElementById("adminSection").classList.remove("hidden");
}
