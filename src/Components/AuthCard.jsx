function AuthCard({ title, subtitle, children }) {
    return (
        <div className="min-h-screen flex justify-center items-center bg-cover bg-center" style={{ backgroundImage: "url('/background.svg')" }}>
            <div className="w-[430px] rounded-[35px] bg-white/75 backdrop-blur-xl p-10 shadow-2xl">
                {/* Logo */}
                <div className="w-[230px] mx-auto rounded-xl bg-[#0086FF] py-3 text-center text-white font-['Luckiest_Guy'] text-[28px] tracking-[2px]">Y.A.A.R.A.N.A</div>

                <h1 className="mt-8 text-center font-['Luckiest_Guy'] text-[42px] text-[#4a302c] tracking-[2px]">{title}</h1>

                <p className="mt-3 mb-8 text-center font-['Carter_One'] text-sm text-[#6d5d58]">{subtitle}</p>

                {children}
            </div>
        </div>
    );
}

export default AuthCard;
