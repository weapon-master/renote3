const StreamZip = require('node-stream-zip');
const fs = require('fs');
const path = require('path');

// 测试 EPUB 封面提取功能
async function testEpubCoverExtraction(epubFilePath) {
  console.log(`\n=== 测试 EPUB 封面提取 ===`);
  console.log(`文件路径: ${epubFilePath}`);
  
  if (!fs.existsSync(epubFilePath)) {
    console.error('文件不存在!');
    return;
  }
  
  let zip = null;
  
  try {
    // 创建 StreamZip 实例
    zip = new StreamZip.async({ file: epubFilePath });
    const entries = await zip.entries();
    
    console.log(`\nEPUB 文件包含 ${Object.keys(entries).length} 个条目`);
    
    // 显示所有条目（前20个）
    const allEntries = Object.keys(entries);
    console.log('\n前20个条目:');
    allEntries.slice(0, 20).forEach((entry, index) => {
      console.log(`${index + 1}. ${entry}`);
    });
    
    if (allEntries.length > 20) {
      console.log(`... 还有 ${allEntries.length - 20} 个条目`);
    }
    
    // 查找图片文件
    const imageFiles = allEntries.filter(entry => 
      /\.(jpeg|jpg|png|gif|webp)$/i.test(entry)
    );
    
    console.log(`\n找到 ${imageFiles.length} 个图片文件:`);
    imageFiles.forEach((img, index) => {
      console.log(`${index + 1}. ${img}`);
    });
    
    // 查找可能的封面文件
    const coverFiles = allEntries.filter(entry => 
      entry.toLowerCase().includes('cover') && 
      /\.(jpeg|jpg|png|gif|webp)$/i.test(entry)
    );
    
    console.log(`\n找到 ${coverFiles.length} 个可能的封面文件:`);
    coverFiles.forEach((cover, index) => {
      console.log(`${index + 1}. ${cover}`);
    });
    
    // 尝试提取第一个图片作为封面
    if (imageFiles.length > 0) {
      const firstImage = imageFiles[0];
      console.log(`\n尝试提取第一个图片: ${firstImage}`);
      
      const tempDir = require('os').tmpdir();
      const coverFileName = `test_cover_${Date.now()}_${path.basename(firstImage)}`;
      const coverFilePath = path.join(tempDir, coverFileName);
      
      try {
        await zip.extract(firstImage, coverFilePath);
        const stats = fs.statSync(coverFilePath);
        console.log(`图片提取成功: ${coverFilePath}`);
        console.log(`文件大小: ${stats.size} 字节`);
        
        // 清理临时文件
        fs.unlinkSync(coverFilePath);
        console.log('临时文件已清理');
        
      } catch (extractError) {
        console.error(`提取图片失败:`, extractError);
      }
    }
    
  } catch (error) {
    console.error('处理 EPUB 文件时出错:', error);
  } finally {
    if (zip) {
      try {
        await zip.close();
        console.log('\nEPUB 文件已关闭');
      } catch (closeError) {
        console.error('关闭 EPUB 文件时出错:', closeError);
      }
    }
  }
}

// 如果直接运行此脚本，则执行测试
if (require.main === module) {
  const epubPath = process.argv[2];
  
  if (!epubPath) {
    console.log('使用方法: node test-epub-cover.js <epub文件路径>');
    console.log('例如: node test-epub-cover.js "D:\\Downloads\\test.epub"');
    process.exit(1);
  }
  
  testEpubCoverExtraction(epubPath);
}

module.exports = { testEpubCoverExtraction };
