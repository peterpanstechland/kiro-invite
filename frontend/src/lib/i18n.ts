export type Locale = 'zh' | 'en'

export const translations = {
  zh: {
    // 页面标题
    pageTitle: 'Kiro 账号认领',
    
    // 表单页面
    inviteReceived: '您收到了 Kiro 账号邀请',
    tier: '等级',
    createdAt: '创建时间',
    expiresAt: '有效期至',
    email: '邮箱',
    emailRequired: '*',
    emailPlaceholder: 'your@email.com',
    emailHint: '用于接收验证码邮件',
    name: '姓名',
    nameOptional: '(可选)',
    namePlaceholder: '您的姓名',
    claimAccount: '认领账号',
    
    // 加载状态
    loading: '加载中...',
    creatingAccount: '正在创建账号...',
    
    // 成功页面
    successTitle: '🎉 认领成功！',
    successSubtitle: '您的 Kiro 账号已创建',
    username: '用户名',
    validUntil: '有效期至',
    
    // 重要提示
    importantTitle: '⚠️ 重要：请完成以下步骤！',
    importantDesc: '账号已创建，请按照下方步骤设置密码并联系管理员开通订阅。',
    
    // 设置密码步骤
    stepsTitle: '📝 第一步：设置密码',
    step1: '点击下方 "前往 SSO 登录页面" 按钮',
    step2: '输入您的用户名，点击 "Next"',
    step3: '您的用户名：',
    step4: '检查您的邮箱 {email}，获取验证码',
    step5: '输入验证码完成邮箱验证',
    step6: '设置一个新密码（至少8位，包含大小写字母和数字）',
    clickToCopy: '点击复制',
    copied: '已复制用户名！',
    
    // 联系管理员
    contactAdminTitle: '📞 第二步：联系管理员开通订阅',
    contactAdminDesc: '密码设置完成后，请联系管理员开通 Kiro 订阅权限。',
    contactAdminNote: '管理员确认开通后，您将收到通知，届时即可使用 Kiro。',
    
    // 如何使用 Kiro
    howToUseTitle: '🚀 第三步：下载并登录 Kiro IDE',
    howToUse1: '下载并安装',
    howToUse2: '打开 Kiro，选择 "Sign in with IAM Identity Center"',
    howToUse3: '输入 SSO 地址：',
    howToUse4: '使用您的用户名和密码登录',
    howToUse5: '开始使用 Kiro 进行 AI 辅助编程！',
    
    // SSO 按钮
    goToSSO: '前往 SSO 登录页面 →',
    ssoAddress: 'SSO 地址',
    
    // 常见问题
    faqTitle: '❓ 常见问题：',
    faq1Q: '收不到验证码邮件？',
    faq1A: '请检查垃圾邮件文件夹，或等待几分钟后重试。邮件来自 AWS (no-reply@login.awsapps.com)。',
    faq2Q: '忘记用户名了？',
    faq2A: '您的用户名是：',
    faq3Q: '密码要求是什么？',
    faq3A: '至少8个字符，必须包含大写字母、小写字母和数字。',
    
    // 错误页面
    errorTitle: '无法认领',
    invalidLink: '无效链接',
    loadFailed: '加载失败',
    claimFailed: '认领失败',
    requestFailed: '请求失败',
  },
  en: {
    // 页面标题
    pageTitle: 'Claim Kiro Account',
    
    // 表单页面
    inviteReceived: 'You received a Kiro account invitation',
    tier: 'Tier',
    createdAt: 'Created',
    expiresAt: 'Expires',
    email: 'Email',
    emailRequired: '*',
    emailPlaceholder: 'your@email.com',
    emailHint: 'For receiving verification code email',
    name: 'Name',
    nameOptional: '(optional)',
    namePlaceholder: 'Your name',
    claimAccount: 'Claim Account',
    
    // 加载状态
    loading: 'Loading...',
    creatingAccount: 'Creating account...',
    
    // 成功页面
    successTitle: '🎉 Success!',
    successSubtitle: 'Your Kiro account has been created',
    username: 'Username',
    validUntil: 'Valid until',
    
    // 重要提示
    importantTitle: '⚠️ Important: Complete the following steps!',
    importantDesc: 'Your account is created. Please set your password and contact admin to activate subscription.',
    
    // 设置密码步骤
    stepsTitle: '📝 Step 1: Set Password',
    step1: 'Click the "Go to SSO Login" button below',
    step2: 'Enter your username, click "Next"',
    step3: 'Your username:',
    step4: 'Check your email {email} for verification code',
    step5: 'Enter the verification code to verify your email',
    step6: 'Set a new password (at least 8 chars, with uppercase, lowercase and numbers)',
    clickToCopy: 'Copy',
    copied: 'Username copied!',
    
    // 联系管理员
    contactAdminTitle: '📞 Step 2: Contact Admin for Subscription',
    contactAdminDesc: 'After setting password, please contact admin to activate your Kiro subscription.',
    contactAdminNote: 'You will be notified once admin confirms activation, then you can use Kiro.',
    
    // 如何使用 Kiro
    howToUseTitle: '🚀 Step 3: Download and Login to Kiro IDE',
    howToUse1: 'Download and install',
    howToUse2: 'Open Kiro, select "Sign in with IAM Identity Center"',
    howToUse3: 'Enter SSO URL:',
    howToUse4: 'Login with your username and password',
    howToUse5: 'Start coding with Kiro AI assistance!',
    
    // SSO 按钮
    goToSSO: 'Go to SSO Login →',
    ssoAddress: 'SSO URL',
    
    // 常见问题
    faqTitle: '❓ FAQ:',
    faq1Q: "Didn't receive verification code email?",
    faq1A: 'Check spam folder, or wait a few minutes and retry. Email is from AWS (no-reply@login.awsapps.com).',
    faq2Q: 'Forgot your username?',
    faq2A: 'Your username is:',
    faq3Q: 'What are the password requirements?',
    faq3A: 'At least 8 characters, must include uppercase, lowercase letters and numbers.',
    
    // 错误页面
    errorTitle: 'Cannot Claim',
    invalidLink: 'Invalid link',
    loadFailed: 'Failed to load',
    claimFailed: 'Claim failed',
    requestFailed: 'Request failed',
  }
}

export function getTranslation(locale: Locale) {
  return translations[locale]
}
