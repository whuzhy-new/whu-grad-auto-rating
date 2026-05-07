// 在 http://newyjs.whu.edu.cn/ 页面自动注入悬浮按钮
// world: MAIN 模式下直接运行在页面上下文，可访问页面 jQuery
// 流程：点待评 → 点第一个待评项 → 全部五星 → 提交 → 循环
(function () {
  if (document.getElementById('auto-five-star-btn')) return;

  var btn = document.createElement('button');
  btn.id = 'auto-five-star-btn';
  btn.textContent = '一键全部评教';
  btn.style.cssText = 'position:fixed;bottom:30px;right:30px;z-index:99999;padding:12px 24px;background:#1677ff;color:#fff;border:none;border-radius:8px;font-size:16px;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.3);';
  document.body.appendChild(btn);

  var running = false;

  btn.addEventListener('click', function () {
    if (running) return;
    running = true;
    btn.textContent = '运行中...';
    startLoop();
  });

  function getJQuery() {
    return window.jQuery || window.$ || window.Q;
  }

  function wait(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  // 等待元素出现
  function waitForElement(selector, timeout) {
    timeout = timeout || 10000;
    return new Promise(function (resolve, reject) {
      var el = document.querySelector(selector);
      if (el) return resolve(el);

      var elapsed = 0;
      var interval = setInterval(function () {
        el = document.querySelector(selector);
        elapsed += 300;
        if (el) {
          clearInterval(interval);
          resolve(el);
        } else if (elapsed >= timeout) {
          clearInterval(interval);
          reject(new Error('等待超时: ' + selector));
        }
      }, 300);
    });
  }

  async function startLoop() {
    var $ = getJQuery();
    var round = 0;

    while (true) {
      round++;
      btn.textContent = '第 ' + round + ' 轮: 点击待评...';

      // 1. 点击「待评」标签
      try {
        var dpTab = await waitForElement('label[data-action="切换评教状态"][data-name="DP"]', 5000);
        if ($) $(dpTab).trigger('click'); else dpTab.click();
      } catch (e) {
        btn.textContent = '未找到待评标签';
        running = false;
        return;
      }

      await wait(1500);

      // 2. 点击第一个待评卡片
      btn.textContent = '第 ' + round + ' 轮: 进入待评项...';
      try {
        var firstCard = await waitForElement('.sc-panel-user-1-container', 8000);
        if ($) $(firstCard).trigger('click'); else firstCard.click();
      } catch (e) {
        // 没有待评项了，完成
        btn.textContent = '全部评教完成！共 ' + (round - 1) + ' 轮';
        running = false;
        return;
      }

      await wait(2000);

      // 3. 等待星级评分加载
      btn.textContent = '第 ' + round + ' 轮: 打五星...';
      try {
        await waitForElement('.wj-form-star', 10000);
      } catch (e) {
        btn.textContent = '星级评分未加载';
        running = false;
        return;
      }

      await wait(500);

      // 4. 给所有评分打五星
      $ = getJQuery();
      var starGroups = document.querySelectorAll('.wj-form-star');
      var needClick = [];

      starGroups.forEach(function (group) {
        var currentVal = group.getAttribute('data-val');
        var items = group.querySelectorAll('.wj-form-star-item');
        if (items.length < 5) return;
        if (currentVal === '5') return;
        needClick.push(items[4]);
      });

      for (var i = 0; i < needClick.length; i++) {
        if ($) {
          $(needClick[i]).trigger('click');
        } else {
          needClick[i].click();
        }
        await wait(100);
      }

      await wait(800);

      // 5. 点击提交
      btn.textContent = '第 ' + round + ' 轮: 提交...';
      var submitBtn = document.querySelector('a[data-action="问卷填写-提交"]');
      if (submitBtn) {
        if ($) $(submitBtn).trigger('click'); else submitBtn.click();
      }

      // 6. 等待提交完成，页面返回
      await wait(3000);
    }
  }
})();
