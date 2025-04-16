async function catatPembelian(nominal, kuantitas = 1) {
  const user = window.currentUser;
  if (!user || !user.username) {
    alert("User tidak valid.");
    return;
  }

  const now = new Date();
  const userID = user.username;
  const total = nominal * kuantitas;

  try {
    // Cek apakah ini pembelian pertama dalam periode cut off
    const tahun = now.getFullYear();
    const bulan = now.getMonth();
    const awalCutOff = new Date(bulan === 0 ? tahun - 1 : tahun, bulan === 0 ? 11 : bulan - 1, 26);
    const akhirCutOff = new Date(tahun, bulan, 25);

    const transaksiSnapshot = await db.collection("transaksi")
      .where("userID", "==", userID)
      .where("tanggal", ">=", awalCutOff)
      .where("tanggal", "<=", akhirCutOff)
      .get();

    const isPembelianPertama = transaksiSnapshot.empty;

    // Simpan transaksi
    await db.collection("transaksi").add({
      userID,
      jumlah: total,
      kuantitas,
      tanggal: now
    });

    // Update status aktif & pembelian pribadi
    await db.collection("users").doc(userID).update({
      pembelianPribadi: firebase.firestore.FieldValue.increment(total),
      statusAktif: true
    });

    // Ambil data user (sponsor & parent)
    const userDoc = await db.collection("users").doc(userID).get();
    const dataUser = userDoc.data();

    // Komisi hanya jika ini pembelian pertama
    if (isPembelianPertama) {
      // Komisi Sponsor
      if (dataUser.sponsorID && dataUser.sponsorID !== 'root') {
        const sponsorRef = db.collection("users").doc(dataUser.sponsorID);

        await db.collection("komisi").add({
          userID: dataUser.sponsorID,
          sumber: userID,
          jenis: "Sponsor",
          nominal: 20000, // fix value
          tanggal: now
        });

        await sponsorRef.update({
          omzetJaringan: firebase.firestore.FieldValue.increment(total)
        });
      }

      // Komisi Matrix (max 10 level)
      let currentID = dataUser.parentID;
      for (let level = 1; level <= 10 && currentID && currentID !== 'root'; level++) {
        const uplineRef = db.collection("users").doc(currentID);
        const uplineDoc = await uplineRef.get();

        if (uplineDoc.exists) {
          const dataUpline = uplineDoc.data();

          // Komisi matrix jika upline aktif
          if (dataUpline.statusAktif) {
            await db.collection("komisi").add({
              userID: currentID,
              sumber: userID,
              jenis: `Matrix Lv${level}`,
              nominal: 10000, // fix value
              tanggal: now
            });
          }

          // Tambah omzet jaringan upline
          await uplineRef.update({
            omzetJaringan: firebase.firestore.FieldValue.increment(total)
          });

          currentID = dataUpline.parentID;
        } else break;
      }
    }

    alert("Transaksi berhasil dicatat!");
  } catch (err) {
    console.error("Gagal catat pembelian:", err);
    alert("Gagal mencatat pembelian.");
  }
}
