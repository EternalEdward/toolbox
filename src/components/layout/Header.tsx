import { Link, useLocation } from 'react-router-dom'

const NAV_ITEMS = [
  { path: '/', label: '首页' },
  { path: '/compress', label: '图片压缩' },
  { path: '/convert', label: '格式转换' },
  { path: '/pdf', label: '图片转PDF' },
  { path: '/remove-bg', label: '换背景' },
]

export default function Header() {
  const location = useLocation()

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="text-lg font-bold text-blue-600 whitespace-nowrap">
          🧰 图片工具箱
        </Link>
        <nav className="flex gap-1 overflow-x-auto">
          {NAV_ITEMS.map(item => {
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3 py-1.5 rounded-md text-sm whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-blue-100 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
