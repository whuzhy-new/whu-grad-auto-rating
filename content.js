// 在 http://newyjs.whu.edu.cn/ 页面自动注入悬浮按钮
// world: MAIN 模式下直接运行在页面上下文，可访问页面 jQuery
// 流程：点待评 → 点第一个待评项 → 全部五星 → 提交 → 循环
(function () {
  if (document.getElementById('auto-five-star-btn')) return;

  // 注入样式
  var style = document.createElement('style');
  style.textContent = `
    #auto-five-star-btn {
      position: fixed;
      bottom: 30px;
      right: 30px;
      z-index: 99999;
      padding: 12px 24px;
      background: rgba(30, 30, 30, 0.85);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      color: #f0f0f0;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 50px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      transition: all 0.25s ease;
      user-select: none;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    #auto-five-star-btn:hover {
      background: rgba(30, 30, 30, 0.95);
      box-shadow: 0 6px 24px rgba(0, 0, 0, 0.25);
      transform: translateY(-1px);
    }
    #auto-five-star-btn:active {
      transform: translateY(0);
    }
    #auto-five-star-btn.running {
      border-color: rgba(99, 102, 241, 0.4);
      box-shadow: 0 4px 20px rgba(99, 102, 241, 0.15);
    }
    #auto-five-star-btn.done {
      border-color: rgba(34, 197, 94, 0.4);
      box-shadow: 0 4px 20px rgba(34, 197, 94, 0.15);
    }
    #auto-five-star-btn.error {
      border-color: rgba(239, 68, 68, 0.4);
      box-shadow: 0 4px 20px rgba(239, 68, 68, 0.15);
    }
  `;
  document.head.appendChild(style);

  var btn = document.createElement('button');
  btn.id = 'auto-five-star-btn';
  btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg><span>一键全部评教</span>';
  document.body.appendChild(btn);

  var running = false;

  function setText(text, className) {
    btn.querySelector('span').textContent = text;
    btn.className = className || '';
  }

  btn.addEventListener('click', function () {
    if (running) return;
    running = true;
    setText('运行中...', 'running');
    startLoop();
  });

  function getJQuery(doc) {
    var w = doc ? (doc.defaultView || window) : window;
    return w.jQuery || w.$ || w.Q;
  }

  function wait(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  // 在当前文档和所有 iframe 中查找元素
  function queryInAllFrames(selector) {
    var el = document.querySelector(selector);
    if (el) return { el: el, doc: document };

    // 遍历所有 iframe
    var iframes = document.querySelectorAll('iframe');
    for (var i = 0; i < iframes.length; i++) {
      try {
        var iframeDoc = iframes[i].contentDocument || iframes[i].contentWindow.document;
        if (iframeDoc) {
          el = iframeDoc.querySelector(selector);
          if (el) return { el: el, doc: iframeDoc };
        }
      } catch (e) {
        // 跨域 iframe 无法访问，跳过
      }
    }
    return null;
  }

  // 在所有 frame 中查找所有匹配元素
  function queryAllInAllFrames(selector) {
    var results = [];
    var els = document.querySelectorAll(selector);
    for (var i = 0; i < els.length; i++) results.push({ el: els[i], doc: document });

    var iframes = document.querySelectorAll('iframe');
    for (var i = 0; i < iframes.length; i++) {
      try {
        var iframeDoc = iframes[i].contentDocument || iframes[i].contentWindow.document;
        if (iframeDoc) {
          els = iframeDoc.querySelectorAll(selector);
          for (var j = 0; j < els.length; j++) results.push({ el: els[j], doc: iframeDoc });
        }
      } catch (e) {}
    }
    return results;
  }

  // 等待元素出现（同时搜索 iframe）
  function waitForElement(selector, timeout) {
    timeout = timeout || 15000;
    return new Promise(function (resolve, reject) {
      var result = queryInAllFrames(selector);
      if (result) return resolve(result);

      var elapsed = 0;
      var interval = setInterval(function () {
        result = queryInAllFrames(selector);
        elapsed += 500;
        if (result) {
          clearInterval(interval);
          resolve(result);
        } else if (elapsed >= timeout) {
          clearInterval(interval);
          reject(new Error('等待超时: ' + selector));
        }
      }, 500);
    });
  }

  async function startLoop() {
    var round = 0;

    while (true) {
      round++;
      setText('第 ' + round + ' 轮: 点击待评...', 'running');

      // 1. 点击「待评」标签
      try {
        var result = await waitForElement('label[data-action="切换评教状态"][data-name="DP"]', 10000);
        var $ = getJQuery(result.doc);
        if ($) $(result.el).trigger('click'); else result.el.click();
      } catch (e) {
        setText('未找到待评标签', 'error');
        running = false;
        return;
      }

      await wait(2000);

      // 2. 点击第一个待评卡片
      setText('第 ' + round + ' 轮: 进入待评项...', 'running');
      try {
        var result = await waitForElement('.sc-panel-user-1-container', 10000);
        var $ = getJQuery(result.doc);
        if ($) $(result.el).trigger('click'); else result.el.click();
      } catch (e) {
        setText('全部评教完成！共 ' + (round - 1) + ' 轮', 'done');
        running = false;
        return;
      }

      await wait(3000);

      // 3. 等待星级评分加载
      setText('第 ' + round + ' 轮: 打五星...', 'running');
      try {
        await waitForElement('.wj-form-star', 15000);
      } catch (e) {
        setText('星级评分未加载', 'error');
        running = false;
        return;
      }

      await wait(500);

      // 4. 给所有评分打五星
      var starResults = queryAllInAllFrames('.wj-form-star');
      var needClick = [];

      starResults.forEach(function (item) {
        var group = item.el;
        var currentVal = group.getAttribute('data-val');
        var items = group.querySelectorAll('.wj-form-star-item');
        if (items.length < 5) return;
        if (currentVal === '5') return;
        needClick.push({ el: items[4], doc: item.doc });
      });

      for (var i = 0; i < needClick.length; i++) {
        var $ = getJQuery(needClick[i].doc);
        if ($) {
          $(needClick[i].el).trigger('click');
        } else {
          needClick[i].el.click();
        }
        await wait(100);
      }

      await wait(1000);

      // 5. 点击提交
      setText('第 ' + round + ' 轮: 提交...', 'running');
      var submitResult = queryInAllFrames('a[data-action="问卷填写-提交"]');
      if (submitResult) {
        var $ = getJQuery(submitResult.doc);
        if ($) $(submitResult.el).trigger('click'); else submitResult.el.click();
      }

      // 6. 等待提交完成，页面返回
      await wait(3000);
    }
  }
})();
