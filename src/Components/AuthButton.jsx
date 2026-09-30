function AuthButton({ text }) {
  return (
    <button
      className="
      w-full
      h-14
      rounded-2xl
      bg-[#0086FF]
      text-white
      font-['Luckiest_Guy']
      text-lg
      tracking-[2px]
      transition
      hover:bg-blue-600
      hover:-translate-y-1
      "
    >
      {text}
    </button>
  );
}

export default AuthButton;