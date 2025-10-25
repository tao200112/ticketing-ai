import { redirect } from 'next/navigation'

/**
 * 旧页面重定向到新路由
 */
export default function RidiculousChickenRedirect() {
  redirect('/event/ridiculous-chicken')
}
