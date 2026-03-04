<?php
session_start();

// PASSWORD RAHASIA (GANTI SESUAI KEBUTUHAN)
$upload_password = "Lum4jang"; // GANTI DI SINI

// LOGOUT
if (isset($_GET['logout'])) {
    unset($_SESSION['upload_access']);
    session_destroy();
    header("Location: upload.php");
    exit;
}

// CEK PASSWORD
if (isset($_POST['upload_pass'])) {
    if ($_POST['upload_pass'] === $upload_password) {
        $_SESSION['upload_access'] = true;
    } else {
        $error = "Password salah!";
    }
}

// JIKA BELUM LOGIN
if (!isset($_SESSION['upload_access'])) {
    ?>
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Login Upload</title>
        <link rel="stylesheet" href="assets/css/style.css">
        <style>
            .password-box {
                max-width: 600px; margin: 50px auto; padding: 30px;
                background: white; border-radius: 20px; box-shadow: 0 15px 35px rgba(0,0,0,0.12);
                text-align: center; font-family: sans-serif;
            }
            .password-box input {
                width: 100%; padding: 15px; margin: 15px 0;
                border: 2px dashed #ccc; border-radius: 16px; background: #f8fbff;
            }
            .password-box button {
                padding: 12px 24px; border: none; border-radius: 50px; font-weight: bold; cursor: pointer; margin: 10px; transition: 0.3s;
                background: #f39c12; color: white;
            }
            .error { color: red; margin: 10px 0; }
        </style>
    </head>
    <body class="upload-access">
        <div class="container">
            <div class="password-box">
                <h2>Masukkan Password</h2>
                <?php if (isset($error)) echo "<p class='error'>$error</p>"; ?>
                <form method="post">
                    <input type="password" name="upload_pass" placeholder="Password" required>
                    <button type="submit">Masuk</button>
                </form>
            </div>
        </div>
    </body>
    </html>
    <?php
    exit;
}

// JIKA SUDAH LOGIN — PROSES UPLOAD
if (isset($_FILES['file'])) {
    $target_dir = "uploads/";
    $file_name = basename($_FILES["file"]["name"]);
    $target_file = $target_dir . $file_name;
    $file_type = strtolower(pathinfo($target_file, PATHINFO_EXTENSION));

    if ($file_type != "xlsx") {
        $upload_error = "Hanya file .xlsx yang diizinkan!";
    } elseif (file_exists($target_file)) {
        $upload_error = "File sudah ada!";
    } elseif ($_FILES["file"]["size"] > 5000000) {
        $upload_error = "File terlalu besar!";
    } else {
        if (move_uploaded_file($_FILES["file"]["tmp_name"], $target_file)) {
            $upload_success = "File $file_name berhasil diupload!";
        } else {
            $upload_error = "Gagal upload file!";
        }
    }
}

// DAFTAR FILE
$files = array_diff(scandir('uploads/'), ['.', '..']);
?>

<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Upload Excel</title>
    <link rel="stylesheet" href="assets/css/style.css">
    <style>
        .upload-container {
            max-width: 600px; margin: 50px auto; padding: 30px;
            background: white; border-radius: 20px; box-shadow: 0 15px 35px rgba(0,0,0,0.12);
            text-align: center; font-family: sans-serif;
        }
        .drop-zone {
            border: 3px dashed #3498db; border-radius: 16px; padding: 40px;
            background: #f8fbff; transition: 0.3s; cursor: pointer;
        }
        .drop-zone.dragover { background: #e3f2fd; border-color: #2980b9; }
        .btn { padding: 12px 24px; border: none; border-radius: 50px; font-weight: bold; cursor: pointer; margin: 10px; transition: 0.3s; }
        .btn-orange { background: #f39c12; color: white; }
        .btn-orange:hover { background: #e67e22; transform: scale(1.05); }
        .btn-logout { background: #c62828 !important; }
    </style>
</head>
<body>
    <div class="container">
        <header style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
            <h1>Upload Excel (.xlsx)</h1>
            <div style="display:flex; gap:10px;">
                <a href="index.php" class="btn-upload">Kembali</a>
                <a href="?logout" class="btn-upload btn-logout">Logout</a>
            </div>
        </header>

        <?php if (isset($upload_success)) echo "<p style='color:#27ae60; font-weight:bold; font-size:18px; text-align:center; background:#d5f5e3; padding:12px; border-radius:12px; margin:15px 0;'>$upload_success</p>"; ?>
        <?php if (isset($upload_error)) echo "<p style='color:red; text-align:center;'>$upload_error</p>"; ?>

        <div class="upload-container">
            <form method="post" enctype="multipart/form-data">
                <div class="drop-zone" id="dropZone">
                    <p style="color:#666;margin-bottom:20px;">Drag & Drop atau Klik</p>
                    <label class="btn btn-orange">
                        Pilih File
                        <input type="file" id="fileInput" name="file" style="display:none;" required accept=".xlsx">
                    </label>
                    <p style="color:#999;margin-top:15px;" id="file-name">No file chosen</p>
                </div>
                <button type="submit" class="btn btn-orange" style="width:100%;margin-top:20px;">Upload</button>
            </form>

            <h3 style="margin-top:40px;color:#333;">File Saat Ini:</h3>
            <ul style="list-style:none;padding:0;">
                <?php foreach ($files as $file): ?>
                    <?php if (pathinfo($file, PATHINFO_EXTENSION) === 'xlsx'): ?>
                        <li style="padding:10px 0;border-bottom:1px solid #eee;display:flex;justify-content:space-between;">
                            • <?= htmlspecialchars($file) ?>
                            <a href="?delete=<?= urlencode($file) ?>" onclick="return confirm('Hapus <?= $file ?>?')" style="color:red;">Hapus</a>
                        </li>
                    <?php endif; ?>
                <?php endforeach; ?>
            </ul>
        </div>
    </div>

    <script>
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');
        const fileName = document.getElementById('file-name');

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(e => dropZone.addEventListener(e, ev => ev.preventDefault()));
        ['dragenter', 'dragover'].forEach(e => dropZone.addEventListener(e, () => dropZone.classList.add('dragover')));
        ['dragleave', 'drop'].forEach(e => dropZone.addEventListener(e, () => dropZone.classList.remove('dragover')));

        dropZone.addEventListener('drop', e => {
            const files = e.dataTransfer.files;
            if (files.length) { fileInput.files = files; fileName.textContent = files[0].name; }
        });

        fileInput.addEventListener('change', () => {
            if (fileInput.files.length) fileName.textContent = fileInput.files[0].name;
        });
    </script>
</body>
</html>

<?php
// HAPUS FILE
if (isset($_GET['delete']) && $_SESSION['upload_access']) {
    $file_to_delete = "uploads/" . basename($_GET['delete']);
    if (file_exists($file_to_delete) && pathinfo($file_to_delete, PATHINFO_EXTENSION) === 'xlsx') {
        unlink($file_to_delete);
        header("Location: upload.php");
        exit;
    }
}
?>