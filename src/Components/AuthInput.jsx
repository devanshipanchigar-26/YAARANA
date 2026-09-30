function AuthInput({
  label,
  type = "text",
  placeholder,
}) {
  return (
    <div className="mb-5">

      <label className="block mb-2 font-['Carter_One'] text-[#4a302c]">
        {label}
      </label>

      <input
        type={type}
        placeholder={placeholder}
        className="
        w-full
        h-14
        rounded-2xl
        px-5
        bg-[#F5EFE6]
        outline-none
        border-2
        border-transparent
        font-['Carter_One']
        transition
        focus:border-[#0086FF]
        "
      />

    </div>
  );
}

export default AuthInput;