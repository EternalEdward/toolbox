import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="max-w-lg mx-auto px-4 py-24 text-center">
      <div className="text-6xl mb-4">🔍</div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">页面未找到</h1>
      <p className="text-gray-500 mb-6">你访问的页面不存在，请检查链接是否正确。</p>
      <Link to="/" className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
        返回首页
      </Link>
    </div>
  )
}
