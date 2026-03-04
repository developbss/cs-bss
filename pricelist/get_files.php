<?php
$files = array_diff(scandir('uploads/'), ['.', '..']);
foreach ($files as $file): 
    if (pathinfo($file, PATHINFO_EXTENSION) === 'xlsx'): 
?>
    <div style="padding:10px 0;border-bottom:1px solid #eee;display:flex;justify-content:space-between;">
        • <?= htmlspecialchars($file) ?>
        <a href="process_upload.php?delete=<?= urlencode($file) ?>" onclick="return confirm('Hapus <?= $file ?>?')" style="color:red;" data-file="<?= htmlspecialchars($file) ?>">Hapus</a>
    </div>
<?php endif; endforeach; ?>