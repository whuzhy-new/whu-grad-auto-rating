chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: autoRate,
  });
});

function autoRate() {
  // 找到页面上所有星级评分组件中 data-index="4" 的星星（第5颗，即满星）
  const stars = document.querySelectorAll('.wj-form-star .wj-form-star-item[data-index="4"]');
  let clicked = 0;
  stars.forEach((star) => {
    star.click();
    clicked++;
  });
  alert(`已自动点击 ${clicked} 个评价项的第5颗星（满分）`);
}
