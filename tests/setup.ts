import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { resetMockDb, setMockLatency } from '../src/api/courseApi.ts';

/**
 * 把 mock 接口的模拟网络延迟归零。
 *
 * 页面用例里有「点按钮 → 等 mock 返回 → 断言表格变化」这类链路。若靠 flush(N) 轮询等待，
 * setTimeout(0) 的实际间隔依平台而异（Windows 约 15ms，Linux 容器约 1ms），
 * 慢机器上会读到中间态造成随机失败。归零后等待不再依赖机器速度。
 * AUDIT_MOCK_LATENCY 仅供健壮性实验（模拟慢机器）时覆盖。
 */
setMockLatency(Number(process.env.AUDIT_MOCK_LATENCY ?? 0));

// jsdom 没有 matchMedia / ResizeObserver，TDesign 的 Select、Dialog 等会读取它们。
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

if (!('ResizeObserver' in window)) {
  class ResizeObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  Object.defineProperty(window, 'ResizeObserver', { writable: true, value: ResizeObserverStub });
}

if (!('IntersectionObserver' in window)) {
  class IntersectionObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
    takeRecords(): [] {
      return [];
    }
  }
  Object.defineProperty(window, 'IntersectionObserver', { writable: true, value: IntersectionObserverStub });
}

if (!('scrollTo' in window)) {
  Object.defineProperty(window, 'scrollTo', { writable: true, value: () => {} });
}
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

/**
 * react-router 的数据路由在导航时会 `new Request(url, { signal })`。
 * jsdom 的 AbortSignal 与 Node undici 内部的 AbortSignal 不是同一个类，
 * 直接传会抛 "Expected signal to be an instance of AbortSignal" 并让导航中断。
 * 测试里没有 loader/fetch，把 signal 丢掉即可，不影响断言的路由状态。
 */
const NodeRequest = globalThis.Request;
if (typeof NodeRequest === 'function' && !(NodeRequest as { __patched?: boolean }).__patched) {
  class PatchedRequest extends NodeRequest {
    constructor(input: RequestInfo | URL, init?: RequestInit) {
      if (init && init.signal) {
        const { signal: _dropped, ...rest } = init;
        super(input, rest);
        return;
      }
      super(input, init);
    }
  }
  (PatchedRequest as { __patched?: boolean }).__patched = true;
  Object.defineProperty(globalThis, 'Request', { writable: true, configurable: true, value: PatchedRequest });
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  // 每个用例都从同一份种子数据开始，避免写操作互相污染
  resetMockDb();
  localStorage.removeItem('academy.course.currentUser.v1');
});
